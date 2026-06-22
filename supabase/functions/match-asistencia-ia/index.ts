import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      console.error("[match-asistencia-ia] OPENAI_API_KEY no configurado");
      return json({ error: "OPENAI_API_KEY no está configurada en los secretos del proyecto" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "No autorizado: sesión inválida" }, 401);
    const user = userRes.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [{ data: roles }, { data: operadores }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("mentor_operadores").select("activo").eq("mentor_id", user.id).eq("activo", true),
    ]);
    const roleNames = (roles || []).map((r: any) => String(r.role));
    const allowed = roleNames.includes("admin") || roleNames.includes("mentor") || (operadores || []).length > 0;
    if (!allowed) return json({ error: "Sin permisos" }, 403);

    const body = await req.json().catch(() => ({}));
    const { not_found_emails = [], not_found_emps = [], not_found_ids = [], extra_context = "", nivel, cohortes } = body;
    // Backwards compat: support old "not_found" flat list
    const legacy: string[] = Array.isArray(body.not_found) ? body.not_found : [];

    const allItems: Array<{ value: string; tipo: "email" | "emprendimiento" | "identificacion" }> = [
      ...not_found_emails.map((v: string) => ({ value: v, tipo: "email" as const })),
      ...not_found_emps.map((v: string) => ({ value: v, tipo: "emprendimiento" as const })),
      ...not_found_ids.map((v: string) => ({ value: v, tipo: "identificacion" as const })),
      ...legacy.map((v: string) => ({ value: v, tipo: (v.includes("@") ? "email" : "emprendimiento") as any })),
    ];
    if (allItems.length === 0) return json({ suggestions: [] });
    if (!nivel) return json({ error: "nivel requerido" }, 400);

    // Catalog
    const { data: cupos } = await admin
      .from("asignacion_cupos")
      .select("emprendimiento_id, cohorte, nivel")
      .eq("estado", "aprobado")
      .eq("nivel", nivel);
    const filtered = (cupos || []).filter((c) => !cohortes || cohortes.length === 0 || cohortes.includes(c.cohorte));
    const empIds = [...new Set(filtered.map((c) => c.emprendimiento_id))];
    if (empIds.length === 0) return json({ suggestions: [] });

    const cupoByEmp = new Map(filtered.map((c) => [c.emprendimiento_id, c]));
    const { data: emps } = await admin.from("emprendimientos").select("id, nombre, user_id").in("id", empIds);
    const { data: miembros } = await admin.from("emprendimiento_miembros").select("user_id, emprendimiento_id").in("emprendimiento_id", empIds);
    const allUserIds = [...new Set([...(emps || []).map((e) => e.user_id), ...(miembros || []).map((m) => m.user_id)])];
    const { data: usuarios } = allUserIds.length
      ? await admin.from("usuarios").select("id, nombres, apellidos, email, numero_identificacion").in("id", allUserIds)
      : { data: [] as any[] };
    const userMap = new Map((usuarios || []).map((u) => [u.id, u]));

    const catalog = (emps || []).map((e) => {
      const cupo = cupoByEmp.get(e.id);
      const owner = userMap.get(e.user_id);
      const cofIds = (miembros || []).filter((m) => m.emprendimiento_id === e.id && m.user_id !== e.user_id).map((m) => m.user_id);
      const cofounders = cofIds.map((id) => userMap.get(id)).filter(Boolean).map((u: any) => ({
        nombre: `${u.nombres || ""} ${u.apellidos || ""}`.trim(),
        email: u.email || "",
        identificacion: u.numero_identificacion || "",
      }));
      return {
        emprendimiento_id: e.id,
        nombre: e.nombre,
        nivel: cupo?.nivel,
        cohorte: cupo?.cohorte,
        owner: owner ? {
          nombre: `${owner.nombres || ""} ${owner.apellidos || ""}`.trim(),
          email: owner.email || "",
          identificacion: owner.numero_identificacion || "",
        } : null,
        cofounders,
      };
    });

    const systemPrompt = `Eres un asistente experto en cruzar registros de asistencia con un catálogo de emprendimientos.
Recibirás items NO encontrados (correos, nombres de emprendimientos o números de identificación) y un catálogo de emprendimientos del nivel/cohorte seleccionado.
Para cada item, encuentra el emprendimiento del catálogo que mejor coincida considerando:
- Typos, mayúsculas/minúsculas, tildes, abreviaciones, palabras omitidas.
- Para emails: coincidencia parcial con email del owner o cofounders, o variantes del nombre.
- Para nombres de emprendimientos: similitud por nombre.
- Para identificaciones: igualdad numérica con owner o cofounders ignorando puntos/guiones/espacios.
Sé conservador: si no hay coincidencia clara, devuelve null. Devuelve SIEMPRE JSON válido.`;

    const userPrompt = `ITEMS NO ENCONTRADOS (${allItems.length}):
${allItems.map((it, i) => `${i + 1}. [${it.tipo}] ${it.value}`).join("\n")}

CONTEXTO EXTRA DEL USUARIO:
${extra_context || "(ninguno)"}

CATÁLOGO DE EMPRENDIMIENTOS (nivel=${nivel}${cohortes?.length ? `, cohortes=${cohortes.join(",")}` : ""}):
${JSON.stringify(catalog, null, 2)}

Devuelve un objeto JSON con la forma:
{ "suggestions": [ { "item": "<valor original>", "tipo": "email|emprendimiento|identificacion", "emprendimiento_id": "<id o null>", "emprendimiento_nombre": "<nombre o null>", "razon": "<por qué coincide>" } ] }
Un objeto por cada item recibido, en el mismo orden.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const txt = await aiResp.text();
      console.error("[match-asistencia-ia] OpenAI error", status, txt);
      return json({ error: `OpenAI ${status}: ${txt.slice(0, 300)}` }, 502);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (e) {
      console.error("[match-asistencia-ia] invalid JSON from model", content);
      return json({ error: "Respuesta inválida de IA" }, 502);
    }
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    // Enrich with user_ids
    const enriched = suggestions.map((s: any) => {
      if (!s.emprendimiento_id) return { ...s, user_ids: [] };
      const emp = (emps || []).find((e) => e.id === s.emprendimiento_id);
      if (!emp) return { ...s, user_ids: [] };
      const cofIds = (miembros || []).filter((m) => m.emprendimiento_id === emp.id).map((m) => m.user_id);
      return { ...s, user_ids: [...new Set([emp.user_id, ...cofIds])] };
    });

    return json({ suggestions: enriched });
  } catch (err) {
    console.error("[match-asistencia-ia] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
