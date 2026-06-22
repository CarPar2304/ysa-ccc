import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const encoder = new TextEncoder();
const ZIP_FLAG_DATA_DESCRIPTOR_UTF8 = 0x0808;
const ZIP_STORE_METHOD = 0;
const ZIP_MAX_32 = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function updateCrc32(crc: number, chunk: Uint8Array): number {
  let c = (crc ^ ZIP_MAX_32) >>> 0;
  for (const byte of chunk) c = (CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ ZIP_MAX_32) >>> 0;
}

function dosDateTime(date = new Date()): { time: number; day: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function binary(size: number, write: (view: DataView) => void): Uint8Array {
  const out = new Uint8Array(size);
  write(new DataView(out.buffer));
  return out;
}

function localHeader(nameLength: number, time: number, day: number): Uint8Array {
  return binary(30, (v) => {
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, ZIP_FLAG_DATA_DESCRIPTOR_UTF8, true);
    v.setUint16(8, ZIP_STORE_METHOD, true);
    v.setUint16(10, time, true);
    v.setUint16(12, day, true);
    v.setUint32(14, 0, true);
    v.setUint32(18, 0, true);
    v.setUint32(22, 0, true);
    v.setUint16(26, nameLength, true);
    v.setUint16(28, 0, true);
  });
}

function dataDescriptor(crc: number, size: number): Uint8Array {
  if (size > ZIP_MAX_32) throw new Error("Archivo demasiado grande para ZIP estándar");
  return binary(16, (v) => {
    v.setUint32(0, 0x08074b50, true);
    v.setUint32(4, crc >>> 0, true);
    v.setUint32(8, size, true);
    v.setUint32(12, size, true);
  });
}

type CentralEntry = { nameBytes: Uint8Array; crc: number; size: number; offset: number; time: number; day: number };

function centralHeader(entry: CentralEntry): Uint8Array {
  if (entry.size > ZIP_MAX_32 || entry.offset > ZIP_MAX_32) throw new Error("ZIP demasiado grande para formato estándar");
  return binary(46, (v) => {
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 20, true);
    v.setUint16(8, ZIP_FLAG_DATA_DESCRIPTOR_UTF8, true);
    v.setUint16(10, ZIP_STORE_METHOD, true);
    v.setUint16(12, entry.time, true);
    v.setUint16(14, entry.day, true);
    v.setUint32(16, entry.crc >>> 0, true);
    v.setUint32(20, entry.size, true);
    v.setUint32(24, entry.size, true);
    v.setUint16(28, entry.nameBytes.length, true);
    v.setUint16(30, 0, true);
    v.setUint16(32, 0, true);
    v.setUint16(34, 0, true);
    v.setUint16(36, 0, true);
    v.setUint32(38, 0, true);
    v.setUint32(42, entry.offset, true);
  });
}

function endOfCentralDirectory(entries: number, centralSize: number, centralOffset: number): Uint8Array {
  if (entries > 65535 || centralSize > ZIP_MAX_32 || centralOffset > ZIP_MAX_32) {
    throw new Error("ZIP demasiado grande para formato estándar");
  }
  return binary(22, (v) => {
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(4, 0, true);
    v.setUint16(6, 0, true);
    v.setUint16(8, entries, true);
    v.setUint16(10, entries, true);
    v.setUint32(12, centralSize, true);
    v.setUint32(16, centralOffset, true);
    v.setUint16(20, 0, true);
  });
}

function storageObjectUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
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

    // Build the list of files to download
    type FileJob = { tareaName: string; empNombre: string; archivoName: string; path: string };
    const jobs: FileJob[] = [];
    for (const tarea of tareas) {
      const tareaEntregas = entregas.filter((e) => e.tarea_id === tarea.id);
      if (tareaEntregas.length === 0) continue;
      const tareaName = sanitize(tarea.titulo);
      for (const ent of tareaEntregas) {
        const archivos = Array.isArray(ent.archivos_urls) ? ent.archivos_urls as { name: string; url: string }[] : [];
        const empNombre = sanitize(ownerMap.get(ent.user_id) || memberMap.get(ent.user_id) || "sin_emprendimiento");
        for (const archivo of archivos) {
          if (!archivo?.url) continue;
          jobs.push({ tareaName, empNombre, archivoName: archivo.name || "", path: extractPath(archivo.url) });
        }
      }
    }

    console.log(`[download-entregas-modulo] tareas=${tareas.length} entregas=${entregas.length} archivos=${jobs.length}`);

    if (jobs.length === 0) return json({ error: "No hay archivos en las entregas de este módulo" }, 404);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const entries: CentralEntry[] = [];
        const firstErrors: string[] = [];
        let offset = 0;
        let added = 0;
        let failed = 0;

        const push = (bytes: Uint8Array) => {
          controller.enqueue(bytes);
          offset += bytes.byteLength;
        };

        const addEntry = async (entryName: string, source: Response | Uint8Array) => {
          const nameBytes = encoder.encode(entryName);
          const { time, day } = dosDateTime();
          const entryOffset = offset;
          push(localHeader(nameBytes.length, time, day));
          push(nameBytes);

          let crc = 0;
          let size = 0;
          if (source instanceof Uint8Array) {
            crc = updateCrc32(crc, source);
            size = source.byteLength;
            push(source);
          } else if (source.body) {
            const reader = source.body.getReader();
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!value) continue;
                crc = updateCrc32(crc, value);
                size += value.byteLength;
                push(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
          push(dataDescriptor(crc, size));
          entries.push({ nameBytes, crc, size, offset: entryOffset, time, day });
        };

        try {
          for (const j of jobs) {
            const { ext } = splitExt(j.archivoName || j.path.split("/").pop() || "");
            const baseName = `${moduloName} - ${j.tareaName} - ${j.empNombre}`;
            let finalName = `${baseName}${ext}`;
            let uniqueKey = `${j.tareaName}/${finalName}`;
            let counter = 2;
            while (usedNames.has(uniqueKey)) {
              finalName = `${baseName} (${counter})${ext}`;
              uniqueKey = `${j.tareaName}/${finalName}`;
              counter++;
            }
            usedNames.add(uniqueKey);

            const fileResp = await fetch(storageObjectUrl(j.path), {
              headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
            });
            if (!fileResp.ok || !fileResp.body) {
              failed++;
              const detail = `${j.path}: ${fileResp.status} ${fileResp.statusText}`;
              if (firstErrors.length < 10) firstErrors.push(detail);
              await fileResp.body?.cancel();
              continue;
            }

            await addEntry(`${moduloName}/${j.tareaName}/${finalName}`, fileResp);
            added++;
          }

          if (added === 0) {
            const msg = encoder.encode(`No se pudo descargar ningún archivo.\n${firstErrors.join("\n") || "sin detalle"}\n`);
            await addEntry(`${moduloName}/ERROR.txt`, msg);
          } else if (failed > 0) {
            const msg = encoder.encode(`Algunos archivos no pudieron incluirse:\n${firstErrors.join("\n")}\n`);
            await addEntry(`${moduloName}/archivos-no-incluidos.txt`, msg);
          }

          const centralOffset = offset;
          let centralSize = 0;
          for (const entry of entries) {
            const header = centralHeader(entry);
            push(header);
            push(entry.nameBytes);
            centralSize += header.byteLength + entry.nameBytes.byteLength;
          }
          push(endOfCentralDirectory(entries.length, centralSize, centralOffset));
          console.log(`[download-entregas-modulo] stream added=${added} failed=${failed}`);
          controller.close();
        } catch (streamErr) {
          console.error("[download-entregas-modulo] stream error", streamErr);
          controller.error(streamErr);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="entregables-${moduloName}.zip"`,
      },
    });

  } catch (err) {
    console.error("[download-entregas-modulo] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
