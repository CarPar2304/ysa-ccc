

## Plan: Mejoras en Cupos - Sobre-cupo y Mover Nivel

### Cambio 1: Aprobar por encima del límite de cupos

**Archivo:** `src/components/admin/QuotaLevelTab.tsx`

- Reemplazar el bloqueo duro en `handleAprobar` (líneas 241-251) que impide aprobar cuando se excede el límite.
- Agregar estado `pendingOverQuotaApproval` para almacenar temporalmente el emprendimiento que se quiere aprobar.
- Mostrar un `AlertDialog` de confirmación con disclaimer: "Se han agotado los X cupos disponibles para [Nivel]. Estás aprobando solicitudes por encima del límite."
- Si confirma, ejecutar la aprobación normalmente.
- En la card "Cupos Disponibles", mostrar el número en rojo cuando es negativo o cero.

### Cambio 2: Mover nivel para usuarios sin cupo aprobado

**Archivo:** `src/components/admin/QuotaLevelTab.tsx`

- Agregar columna "Mover nivel" en la tabla, visible **solo** para emprendimientos **sin cupo aprobado** (pendiente o sin asignación).
- La columna muestra un `Select` con los otros dos niveles (ej. si está en Growth, muestra Starter y Scale).
- Al seleccionar un nuevo nivel:
  1. Actualizar `emprendimientos.nivel_definitivo` al nuevo nivel.
  2. Si existe una `asignacion_cupos`, actualizar también `asignacion_cupos.nivel`.
  3. Refrescar datos (el emprendimiento desaparece del tab actual y aparece en el tab del nuevo nivel).
- El emprendimiento queda en el nuevo nivel como si siempre hubiera estado ahí. Al aprobar el cupo en ese tab, todo funciona normalmente: el webhook envía el nivel del tab, la BD queda con el nivel correcto, las exportaciones reflejan el nivel asignado.
- Agregar `AlertDialog` de confirmación: "Vas a mover [Emprendimiento] de [Nivel actual] a [Nuevo nivel]. Esto cambiará su nivel independientemente de su puntaje."

### Detalle técnico

**Archivo a modificar:** `src/components/admin/QuotaLevelTab.tsx`

- Importar `AlertDialog` components.
- Nuevos estados: `pendingOverQuotaApproval`, `pendingLevelMove` (con emprendimiento + nuevo nivel).
- Función `handleMoverNivel`: update a `emprendimientos.nivel_definitivo` + update condicional a `asignacion_cupos.nivel` + `fetchData()`.
- Modificar `handleAprobar` para mostrar diálogo en vez de bloquear cuando excede límite.
- No requiere migración de base de datos.

