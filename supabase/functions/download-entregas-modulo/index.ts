import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "entregas";
const SIGNED_URL_TTL_SECONDS = 3600;

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    console.log("[download-entregas-modulo] hasAuth:", !!authHeader);
    if (!authHeader || !/^bearer\s+/i.test(authHeader)) {
      return json({ error: "No autorizado: falta token de sesión" }, 401);
    }

    const token = authHeader.replace(/^bearer\s+/i, "").trim();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Validate JWT explicitly (works without a stored session)
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("[download-entregas-modulo] getUser error:", userErr?.message);
      return json({ error: "No autorizado: token inválido o expirado" }, 401);
    }
    const user = userData.user;
    console.log("[download-entregas-modulo] user:", user.id, user.email);

    // Permissions via user_roles + mentor_operadores (service role bypasses RLS)
    const [{ data: roles, error: rolesErr }, { data: operadores }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("mentor_operadores").select("activo").eq("mentor_id", user.id).eq("activo", true),
    ]);
    if (rolesErr) {
      console.error("[download-entregas-modulo] roles error:", rolesErr.message);
      return json({ error: "Error validando permisos" }, 500);
    }
    const roleNames = (roles || []).map((r: any) => String(r.role));
    const isOperador = (operadores || []).length > 0;
    console.log("[download-entregas-modulo] roles:", roleNames, "operador:", isOperador);
    const allowed = roleNames.includes("admin") || roleNames.includes("mentor") || isOperador;
    if (!allowed) {
      return json({ error: `Sin permisos. Usuario ${user.email}. Roles: ${roleNames.join(", ") || "ninguno"}` }, 403);
    }

    const { modulo_id } = await req.json();
    if (!modulo_id) return json({ error: "modulo_id requerido" }, 400);

    const { data: modulo } = await admin.from("modulos").select("titulo").eq("id", modulo_id).single();
    if (!modulo) return json({ error: "Módulo no encontrado" }, 404);

    const { data: tareas } = await admin.from("tareas").select("id, titulo").eq("modulo_id", modulo_id);
    if (!tareas || tareas.length === 0) return json({ error: "No hay tareas en este módulo" }, 404);

    const tareaIds = tareas.map((t) => t.id);
    const { data: entregas } = await admin.from("entregas").select("id, tarea_id, user_id, archivos_urls").in("tarea_id", tareaIds);
    if (!entregas || entregas.length === 0) return json({ error: "No hay entregas" }, 404);

    const userIds = [...new Set(entregas.map((e) => e.user_id))];
    const { data: ownerEmps } = await admin.from("emprendimientos").select("id, nombre, user_id").in("user_id", userIds);
    const ownerMap = new Map<string, string>();
    for (const e of ownerEmps || []) ownerMap.set(e.user_id, e.nombre || "");
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

    const moduloName = sanitize(modulo.titulo);
    const usedNames = new Set<string>();

    // Build the list of files, with a unique entry name inside the ZIP for each one.
    // The ZIP itself is assembled in the browser: this function only returns
    // short-lived signed URLs, so it never hits the Edge Function CPU limit.
    type FileEntry = { name: string; path: string };
    const fileEntries: FileEntry[] = [];
    for (const tarea of tareas) {
      const tareaEntregas = entregas.filter((e) => e.tarea_id === tarea.id);
      if (tareaEntregas.length === 0) continue;
      const tareaName = sanitize(tarea.titulo);
      for (const ent of tareaEntregas) {
        const archivos = Array.isArray(ent.archivos_urls) ? ent.archivos_urls as { name: string; url: string }[] : [];
        const empNombre = sanitize(ownerMap.get(ent.user_id) || memberMap.get(ent.user_id) || "sin_emprendimiento");
        for (const archivo of archivos) {
          if (!archivo?.url) continue;
          const path = extractPath(archivo.url);
          const { ext } = splitExt(archivo.name || path.split("/").pop() || "");
          const baseName = `${moduloName} - ${tareaName} - ${empNombre}`;
          let finalName = `${baseName}${ext}`;
          let uniqueKey = `${tareaName}/${finalName}`;
          let counter = 2;
          while (usedNames.has(uniqueKey)) {
            finalName = `${baseName} (${counter})${ext}`;
            uniqueKey = `${tareaName}/${finalName}`;
            counter++;
          }
          usedNames.add(uniqueKey);
          fileEntries.push({ name: `${moduloName}/${tareaName}/${finalName}`, path });
        }
      }
    }

    console.log(`[download-entregas-modulo] tareas=${tareas.length} entregas=${entregas.length} archivos=${fileEntries.length}`);

    if (fileEntries.length === 0) return json({ error: "No hay archivos en las entregas de este módulo" }, 404);

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(fileEntries.map((f) => f.path), SIGNED_URL_TTL_SECONDS);
    if (signErr) {
      console.error("[download-entregas-modulo] sign error:", signErr.message);
      return json({ error: `Error generando enlaces de descarga: ${signErr.message}` }, 500);
    }

    const files: { name: string; url: string }[] = [];
    const errores: string[] = [];
    (signed || []).forEach((item, i) => {
      const url = (item as { signedUrl?: string; signedURL?: string }).signedUrl
        || (item as { signedUrl?: string; signedURL?: string }).signedURL;
      if (item?.error || !url) {
        errores.push(`${fileEntries[i].path}: ${item?.error || "sin URL firmada"}`);
        return;
      }
      files.push({ name: fileEntries[i].name, url });
    });

    console.log(`[download-entregas-modulo] firmados=${files.length} fallidos=${errores.length}`);

    if (files.length === 0) {
      return json({ error: `No se pudo generar acceso a ningún archivo. ${errores.slice(0, 5).join("; ")}` }, 500);
    }

    return json({ modulo: moduloName, files, errores });

  } catch (err) {
    console.error("[download-entregas-modulo] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
