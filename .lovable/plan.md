

## Plan: Limitar eventos por día + Arreglar contenedor de Próximos Eventos

### Cambio 1: Máximo 4 eventos visibles por celda del calendario

**Archivo:** `src/components/calendario/CalendarMonthView.tsx`

- En las celdas de cada día, cambiar el límite de eventos single-day visibles de 3 a un máximo combinado de 4 (contando multi-day + single-day).
- Si hay más de 4 eventos en total (multi-day bars + single-day), mostrar solo los primeros 4 y un botón "+N más" que abre un Dialog/popup con todos los eventos de ese día.
- Para los multi-day bars: limitar a máximo 4 segmentos visibles por semana-celda; los adicionales se incluyen en el conteo del "+N más".

### Cambio 2: Arreglar contenedor de Próximos Eventos

**Archivo:** `src/components/calendario/UpcomingEvents.tsx`

- El problema es que el contenedor con `overflow-hidden` en el wrapper principal corta las tarjetas verticalmente.
- Cambiar `overflow-hidden` a `overflow-visible` en el wrapper, y mantener `overflow-x-auto` solo en el scroll container.
- Asegurar que las tarjetas de evento tengan una altura mínima consistente o que el contenedor del scroll se ajuste al alto real de las tarjetas (no las recorte).
- Agregar `overflow-y-visible` al scroll container para que las tarjetas no se corten verticalmente.

### Detalle técnico

**CalendarMonthView.tsx:**
- Cambiar `dayEvents.slice(0, 3)` → `dayEvents.slice(0, Math.max(0, 4 - multiDaySlots))` para que el total visible (multi-day + single-day) sea máximo 4.
- El botón "+N más" calcula: `total = dayEvents.length + multiDaySlots; remaining = total - 4`.
- Al hacer click en "+N más" se llama `onDayClick?.(day)` para abrir el DayDetailSheet existente.

**UpcomingEvents.tsx:**
- Quitar `overflow-hidden` del div wrapper principal (línea 237).
- Mantener `overflow-x-auto` en el scroll container pero sin clip vertical.

