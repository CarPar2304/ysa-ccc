
## 1. Descarga ZIP de entregables por módulo (Admin)

**En:** `src/pages/Estudiantes.tsx` (vista admin, dentro de cada `Card` de módulo en `renderNivelContent`)

- Añadir botón **"Descargar entregables (ZIP)"** visible solo para admin junto al título del módulo.
- Crear edge function `download-entregas-modulo`:
  - Recibe `modulo_id`.
  - Consulta `tareas` del módulo → `entregas` con `archivos_urls`, join con `emprendimientos` (vía `user_id` o `emprendimiento_miembros`) para obtener nombre del emprendimiento.
  - Descarga cada archivo del bucket privado `entregas` con service role.
  - Construye ZIP en streaming con estructura:
    ```
    {Módulo}/
      {Tarea}/
        {Módulo} - {Tarea} - {Emprendimiento}.{ext}
    ```
    (sanitizando nombres y resolviendo colisiones con sufijo numérico)
  - Devuelve `application/zip`.
- Frontend usa `supabase.functions.invoke` y `downloadFile` (blob) con nombre `entregables-{modulo}.zip`.

**Razón edge function:** evita exponer URLs firmadas masivamente y mantiene egress bajo (un solo download del lado del cliente).

## 2. Validación de asistencia mejorada

**En:** `src/components/lab/AttendanceManager.tsx`

### 2.1 Validación por nombre de emprendimiento (además de email)
- Añadir segundo `Textarea` "Nombres de emprendimientos (separados por coma o salto de línea)".
- Botón único **"Validar"** ejecuta en paralelo:
  1. Match por email (lógica actual).
  2. Match por `emprendimientos.nombre` con `ilike` case-insensitive y comparación normalizada (trim, lowercase, sin tildes). Para cada emprendimiento encontrado, obtener todos los `user_id` (owner + `emprendimiento_miembros`) → cada cofounder cuenta como asistente.
- Resultado unificado muestra:
  - Encontrados por email
  - Encontrados por emprendimiento (con badge "Emprendimiento" y lista de cofounders incluidos)
  - No encontrados (emails que no cruzaron + nombres de emprendimientos que no cruzaron, en secciones separadas)
- Deduplicación por `user_id` antes de guardar.

### 2.2 Botón "Analizar con IA"
- Aparece cuando hay items en la lista de no encontrados.
- Abre dialog con un `Textarea` para pegar nombres adicionales (separados por coma o salto de línea) como contexto extra.
- Llama a edge function `match-asistencia-ia`:
  - Input: lista de no encontrados (emails + emprendimientos), texto extra del usuario, y catálogo de emprendimientos del nivel/cohorte (id, nombre, usuarios con nombres).
  - Usa Lovable AI Gateway (`google/gemini-3-flash-preview`) con `Output` schema estructurado: para cada item no encontrado, sugerir `emprendimiento_id` candidato o `null` con razón.
  - Maneja errores 429/402.
- Frontend muestra sugerencias con checkbox para aceptar/rechazar; aceptadas se agregan a la lista de "validados" para guardar.

### 2.3 Botón "Exportar Asistencia" en Estudiantes
**En:** `src/pages/Estudiantes.tsx` (header, visible para admin y operador)

- Abre dialog con filtros:
  - **Nivel** (multi-select, respetando `allowedNiveles`)
  - **Cohorte** (solo aplica a Starter y Growth)
  - **Módulos** (multi-select según niveles)
  - **Clases** (multi-select según módulos; opcional, default todas)
- Al exportar:
  - Consulta `asignacion_cupos` aprobados según filtros → usuarios (owner + cofounders vía `emprendimiento_miembros`).
  - Consulta `progreso_usuario` para esas clases.
  - Genera Excel con `xlsx`/`exceljs` estilizado:
    - Hoja por módulo, filas = estudiantes (con emprendimiento, nivel, cohorte), columnas = clases con ✓/✗.
    - Columna final "% Asistencia" y conteo.
    - Hoja resumen con totales por módulo/cohorte.
    - Estilos: header bold con fondo primario, bordes, anchos auto, congelar fila/columna.

## Notas técnicas

- Edge functions usan `verify_jwt = false` por default; validar admin/operador rol con `is_admin`/`is_operador` desde JWT antes de procesar (especialmente la del ZIP).
- ZIP usa librería compatible con Deno (ej. `npm:jszip`).
- `downloadFile` ya existe en `src/lib/downloadFile.ts`.
- No se requieren cambios de schema ni RLS.

## Archivos afectados

- `src/pages/Estudiantes.tsx` — botones ZIP por módulo, botón exportar asistencia
- `src/components/lab/AttendanceManager.tsx` — validación dual + botón IA + dialog sugerencias
- `src/components/estudiantes/ExportAsistenciaModal.tsx` *(nuevo)*
- `supabase/functions/download-entregas-modulo/index.ts` *(nuevo)*
- `supabase/functions/match-asistencia-ia/index.ts` *(nuevo)*
