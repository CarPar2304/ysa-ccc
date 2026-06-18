import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    const { data: isMentor } = await admin.rpc("is_mentor", { _user_id: user.id });
    if (!isAdmin && !isMentor) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { not_found, extra_context, nivel, cohortes } = await req.json();
    if (!Array.isArray(not_found) || not_found.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build catalog of emprendimientos in nivel/cohortes
    const { data: cupos } = await admin
      .from("asignacion_cupos")
      .select("emprendimiento_id, cohorte, nivel")
      .eq("estado", "aprobado")
      .eq("nivel", nivel);

    const filtered = (cupos || []).filter((c) => !cohortes || cohortes.includes(c.cohorte));
    const empIds = [...new Set(filtered.map((c) => c.emprendimiento_id))];
    if (empIds.length === 0) return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: emps } = await admin.from("emprendimientos").select("id, nombre, user_id").in("id", empIds);
    const userIds = (emps || []).map((e) => e.user_id);
    const { data: usuarios } = await admin.from("usuarios").select("id, nombres, apellidos, email").in("id", userIds);
    const userMap = new Map((usuarios || []).map((u) => [u.id, u]));

    const catalog = (emps || []).map((e) => {
      const u = userMap.get(e.user_id);
      return {
        id: e.id,
        nombre: e.nombre,
        owner: u ? `${u.nombres || ""} ${u.apellidos || ""}`.trim() : "",
        email: u?.email || "",
      };
    });

    const systemPrompt = `Eres un asistente que asocia items no encontrados con emprendimientos de un catálogo. Para cada item, sugiere el emprendimiento más probable del catálogo si hay coincidencia razonable (typos, mayúsculas, abreviaciones, nombre parcial), o null si no hay match claro. Sé conservador.`;

    const userPrompt = `Items no encontrados:\n${not_found.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}\n\nContexto extra del usuario:\n${extra_context || "(ninguno)"}\n\nCatálogo de emprendimientos del nivel ${nivel}:\n${catalog.map((c) => `- id=${c.id} | nombre="${c.nombre}" | fundador="${c.owner}" | email="${c.email}"`).join("\n")}\n\nDevuelve un array "suggestions" con un objeto por cada item en el mismo orden. Cada objeto: { "item": string, "emprendimiento_id": string|null, "emprendimiento_nombre": string|null, "razon": string }.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const txt = await aiResp.text();
      console.error("AI error", status, txt);
      if (status === 429) return new Response(JSON.stringify({ error: "Límite de uso de IA alcanzado. Intenta de nuevo en un momento." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados. Agrega créditos al workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Error en IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    // Enrich with user_ids (owner + cofounders) for the suggested emprendimiento
    const suggestedEmpIds = suggestions.map((s: any) => s.emprendimiento_id).filter(Boolean);
    let cofounders: { user_id: string; emprendimiento_id: string }[] = [];
    if (suggestedEmpIds.length > 0) {
      const { data: mems } = await admin.from("emprendimiento_miembros").select("user_id, emprendimiento_id").in("emprendimiento_id", suggestedEmpIds);
      cofounders = mems || [];
    }
    const enriched = suggestions.map((s: any) => {
      if (!s.emprendimiento_id) return s;
      const emp = (emps || []).find((e) => e.id === s.emprendimiento_id);
      if (!emp) return { ...s, user_ids: [] };
      const ids = [emp.user_id, ...cofounders.filter((c) => c.emprendimiento_id === s.emprendimiento_id).map((c) => c.user_id)];
      return { ...s, user_ids: [...new Set(ids)] };
    });

    return new Response(JSON.stringify({ suggestions: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
