

## Diagnóstico

**Síntoma:** En el perfil de beneficiario, al entrar a "Entregables" se ve brevemente un frame y luego la pantalla queda en blanco (toda la app desaparece).

**Causa raíz (combinada):**

1. **No existe ningún `ErrorBoundary` en la app** (verificado con búsqueda). Cualquier excepción durante render desmonta todo el árbol React → pantalla blanca total.
2. **`ModuleDeliverables.tsx` tiene varios puntos frágiles que pueden lanzar durante render:**
   - `format(new Date(tarea.fecha_limite))` y `format(new Date(entrega.fecha_entrega))` — si la fecha viene `null`/inválida, `date-fns` lanza `RangeError: Invalid time value` y rompe todo.
   - `entrega.archivos_urls.map(...)` — si por alguna entrega el campo viene como objeto/null no-array, `.map` lanza.
   - El `useEffect` que llama a `fetchMisEntregas` depende de `tareas` (referencia nueva en cada fetch); puede disparar fetches en cascada y resolver con datos parciales mientras el componente ya renderizó.
3. **`getTeamUserIds`** hace múltiples queries; si una falla por RLS devuelve `[userId]` silenciosamente, pero los `useEffect` no abortan al desmontar — un `setState` tras unmount + un segundo render con datos inconsistentes puede provocar el "frame, luego blanco".
4. **`isBeneficiario` es `false` durante el primer render** (mientras `useUserRole` carga) → renderiza el bloque "no beneficiario" y luego cambia → el segundo render con datos parciales es donde explota.

## Plan de corrección

### 1. Agregar `ErrorBoundary` global (red de seguridad)
- Crear `src/components/ErrorBoundary.tsx` (clase React) que capture errores de render y muestre una UI de fallback amigable con botón "Recargar" + log a consola.
- Envolver `<Routes>` en `App.tsx` con `<ErrorBoundary>`. Esto evita que cualquier excepción futura vuelva la app blanca.

### 2. Endurecer `ModuleDeliverables.tsx`
- Crear helper `safeFormatDate(date, fmt)` que retorne `"—"` si la fecha es inválida en lugar de lanzar.
- Reemplazar todos los `format(new Date(...))` por `safeFormatDate(...)` (líneas 151, 379, 380, 480).
- Asegurar `Array.isArray(entrega.archivos_urls)` antes de `.map` y al hidratar el estado.
- Esperar a que `useUserRole` termine (`roleLoading`) antes de decidir qué fetch hacer, para evitar el render intermedio.
- Agregar guardia `isMounted` en los fetch async para no hacer `setState` tras unmount.

### 3. Endurecer `TaskSubmission.tsx`
- Garantizar que `archivosExistentes` siempre se inicialice como array (`Array.isArray(...) ? ... : []`).

### 4. Endurecer `getTeamUserIds` (`teamUtils.ts`)
- Ya tiene try/catch, pero asegurar que retorna siempre array no-vacío (incluso si `userId` es vacío).

### Archivos a tocar
- `src/components/ErrorBoundary.tsx` — nuevo.
- `src/App.tsx` — envolver Routes.
- `src/components/lab/ModuleDeliverables.tsx` — helpers, guardas, dependencia en `roleLoading`.
- `src/components/lab/TaskSubmission.tsx` — defensa de `archivos_urls`.
- `src/lib/teamUtils.ts` — defensa adicional.

### Resultado esperado
- Si algo realmente falla, la app muestra mensaje en lugar de pantalla blanca.
- Las fechas inválidas, arrays mal formados y race conditions ya no rompen el render de Entregables.
- Los beneficiarios ven la pestaña Entregables de forma estable.

