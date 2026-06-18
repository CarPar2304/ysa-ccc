## Plan: 4 ajustes (descargas, exportación, IA con OpenAI, asistencia por cohorte)

### 1) Descarga de entregables ZIP — "No autorizado"
La función actual hace `auth.getUser()` con la sesión del usuario y luego consulta `user_roles`. Como el rol existe (`carlosparedesmiranda@gmail.com` = admin), el fallo se produce antes (probablemente `getUser()` o lectura de body). Cambios en `supabase/functions/download-entregas-modulo/index.ts`:

- Cambiar a `userClient.auth.getClaims(token)` (extrayendo el JWT del header) — patrón estándar de Lovable Cloud, evita problemas intermitentes con `getUser()`.
- Validar rol con `admin.rpc("has_role", { _user_id, _role: "admin" })` y también `is_mentor` (para mentor_operador). Mantener fallback a consulta directa de `user_roles`.
- Agregar `console.log` detallados en cada paso (auth recibido, user id, roles) para diagnosticar en logs si vuelve a fallar.
- En el frontend `Estudiantes.tsx`, leer mejor el error: si `resp.status === 401/403`, pedir reautenticación.

### 2) Modal de exportación — cohortes irreales
En `src/components/estudiantes/ExportAsistenciaModal.tsx`:

- Eliminar el array fijo `[1,2,3,4]`. En su lugar, consultar `asignacion_cupos` (cohortes únicas existentes en los niveles seleccionados, solo Starter/Growth, estado `aprobado`) y mostrar solo esas opciones dinámicamente.
- Por defecto seleccionar todas las cohortes disponibles.

### 3) IA de validación de asistencia con token propio (OpenAI)
En `supabase/functions/match-asistencia-ia/index.ts`:

- Reemplazar `LOVABLE_API_KEY` y endpoint `ai.gateway.lovable.dev` por OpenAI: `https://api.openai.com/v1/chat/completions` con `Authorization: Bearer ${OPENAI_API_KEY}`.
- Modelo: `gpt-4o-mini` (económico, soporta `response_format: json_object` de forma estable; `o4-mini` no soporta JSON mode con el mismo formato).
- Mantener el mismo prompt y formato de respuesta.
- Requiere guardar secret nuevo: **`OPENAI_API_KEY`** (lo pediré después de tu confirmación). Lo obtienes en https://platform.openai.com/api-keys.

### 4) Asistencia por cohorte (corregir % y exportación)
Hoy `progreso_usuario` se asocia a `clase_id`, pero el cálculo cuenta TODAS las clases del módulo sin importar la cohorte del estudiante. La columna `clases.cohorte` es `integer[]` (una clase puede pertenecer a 1+ cohortes). Cambios:

**a) `ExportAsistenciaModal.tsx` (exportación Excel)**
- Al calcular la asistencia por estudiante en cada módulo, filtrar `modClases` para incluir solo aquellas cuyo `clases.cohorte` contenga la cohorte del estudiante (`s.cohorte`). Si una clase no tiene cohorte definida, contarla para todos.
- El `%` se calcula sobre ese subconjunto. En las columnas de la hoja, dejar la celda en blanco (gris claro) para clases que no aplican a esa cohorte (en lugar de ✗), para que se distinga claramente "no aplica" vs "ausente".
- Cargar `cohorte` en la query inicial de clases: `select id, modulo_id, titulo, orden, cohorte`.

**b) Vista de progreso del estudiante en la app**
Buscar los componentes que muestran `% de asistencia` del estudiante por módulo (probablemente `Estudiantes.tsx` / `ProgresoModulo*` / `useProgresoUsuario`) y aplicar el mismo filtro: solo contar clases cuya `cohorte` contiene la cohorte aprobada del emprendimiento del usuario. Esto resuelve el caso "Kick off starter" donde aparece 50%.

### Archivos a editar
- `supabase/functions/download-entregas-modulo/index.ts`
- `supabase/functions/match-asistencia-ia/index.ts`
- `src/pages/Estudiantes.tsx`
- `src/components/estudiantes/ExportAsistenciaModal.tsx`
- Componente(s) de progreso por módulo del estudiante (a localizar)

### Secret a agregar
- `OPENAI_API_KEY` — te pediré que lo pegues una vez confirmes el plan.

¿Apruebas para implementar?
