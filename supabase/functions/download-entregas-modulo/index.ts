import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "entregas";

function sanitize(name: string): string {
  return (name || "")
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "sin_nombre";
}

function splitExt(filename: string): { base: string; ext: string } {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return { base: filename, ext: "" };
  return { base: filename.slice(0, idx), ext: filename.slice(idx) };
}

function extractPath(urlOrPath: string): string {
  const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  const signedPrefix = `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/`;
  if (urlOrPath.startsWith(publicPrefix)) return decodeURIComponent(urlOrPath.slice(publicPrefix.length).split("?")[0]);
  if (urlOrPath.startsWith(signedPrefix)) return decodeURIComponent(urlOrPath.slice(signedPrefix.length).split("?")[0]);
  return urlOrPath;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Admin/operador check (query user_roles directly with service role)
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (rolesErr) {
      console.error("[download-entregas-modulo] roles error", rolesErr);
      return new Response(JSON.stringify({ error: "Error validando permisos" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const roleNames = (roles || []).map((r: any) => r.role);
    const allowed = roleNames.includes("admin") || roleNames.includes("mentor_operador");
    if (!allowed) {
      console.warn("[download-entregas-modulo] forbidden user", user.id, roleNames);
      return new Response(JSON.stringify({ error: "Solo administradores u operadores pueden descargar" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const { modulo_id } = await req.json();
    if (!modulo_id) return new Response(JSON.stringify({ error: "modulo_id requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: modulo } = await admin.from("modulos").select("titulo").eq("id", modulo_id).single();
    if (!modulo) return new Response(JSON.stringify({ error: "Módulo no encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tareas } = await admin.from("tareas").select("id, titulo").eq("modulo_id", modulo_id);
    if (!tareas || tareas.length === 0) return new Response(JSON.stringify({ error: "No hay tareas en este módulo" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const tareaIds = tareas.map((t) => t.id);
    const { data: entregas } = await admin.from("entregas").select("id, tarea_id, user_id, archivos_urls").in("tarea_id", tareaIds);

    if (!entregas || entregas.length === 0) return new Response(JSON.stringify({ error: "No hay entregas" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userIds = [...new Set(entregas.map((e) => e.user_id))];
    // Owner emprendimientos
    const { data: ownerEmps } = await admin.from("emprendimientos").select("id, nombre, user_id").in("user_id", userIds);
    const ownerMap = new Map<string, string>();
    for (const e of ownerEmps || []) ownerMap.set(e.user_id, e.nombre || "");
    // Members
    const { data: miembros } = await admin.from("emprendimiento_miembros").select("user_id, emprendimiento_id").in("user_id", userIds);
    const memberEmpIds = [...new Set((miembros || []).map((m) => m.emprendimiento_id))];
    const { data: memberEmps } = memberEmpIds.length
      ? await admin.from("emprendimientos").select("id, nombre").in("id", memberEmpIds)
      : { data: [] as { id: string; nombre: string }[] };
    const empById = new Map((memberEmps || []).map((e) => [e.id, e.nombre || ""]));
    const memberMap = new Map<string, string>();
    for (const m of miembros || []) {
      const n = empById.get(m.emprendimiento_id);
      if (n) memberMap.set(m.user_id, n);
    }

    const zip = new JSZip();
    const moduloName = sanitize(modulo.titulo);
    const moduloFolder = zip.folder(moduloName)!;
    const usedNames = new Set<string>();
    let added = 0;

    for (const tarea of tareas) {
      const tareaEntregas = entregas.filter((e) => e.tarea_id === tarea.id);
      if (tareaEntregas.length === 0) continue;
      const tareaName = sanitize(tarea.titulo);
      const tareaFolder = moduloFolder.folder(tareaName)!;

      for (const ent of tareaEntregas) {
        const archivos = Array.isArray(ent.archivos_urls) ? ent.archivos_urls as { name: string; url: string }[] : [];
        const empNombre = sanitize(ownerMap.get(ent.user_id) || memberMap.get(ent.user_id) || "sin_emprendimiento");

        for (const archivo of archivos) {
          if (!archivo?.url) continue;
          const path = extractPath(archivo.url);
          const { data: blob, error: dErr } = await admin.storage.from(BUCKET).download(path);
          if (dErr || !blob) {
            console.error("Download error", path, dErr);
            continue;
          }
          const { ext } = splitExt(archivo.name || path.split("/").pop() || "");
          let baseName = `${moduloName} - ${tareaName} - ${empNombre}`;
          let finalName = `${baseName}${ext}`;
          const key = `${tareaName}/${finalName}`;
          let counter = 2;
          let uniqueKey = key;
          while (usedNames.has(uniqueKey)) {
            finalName = `${baseName} (${counter})${ext}`;
            uniqueKey = `${tareaName}/${finalName}`;
            counter++;
          }
          usedNames.add(uniqueKey);
          const buf = new Uint8Array(await blob.arrayBuffer());
          tareaFolder.file(finalName, buf);
          added++;
        }
      }
    }

    if (added === 0) return new Response(JSON.stringify({ error: "No se encontraron archivos para descargar" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const zipBlob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="entregables-${moduloName}.zip"`,
      },
    });
  } catch (err) {
    console.error("[download-entregas-modulo] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
