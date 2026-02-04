
# Plan: Pulir modal de exportación y corregir PDF en blanco

## Objetivo
1) Que el modal sea 100% responsive (sin overflow horizontal y con footer/botones siempre dentro).
2) Que el PDF nunca salga en blanco (1 o múltiples diagnósticos).

## Problemas identificados

### Problema 1: Overflow/recorte en el modal (mobile)
- Las filas pueden empujar el ancho por contenido largo/scrollbars.
- El footer puede quedar “fuera” si el contenedor no permite que el área scrolleable se encoja (`min-h-0`).

### Problema 2: PDF en blanco
- `html2pdf` usa `html2canvas`. Si el nodo a renderizar está **transparente** (`opacity: 0`) o **no renderizable** (hidden/display none), `html2canvas` puede devolver un canvas blanco.

## Solución

### Parte A: Modal realmente responsive
**Archivo:** `src/components/admin/DiagnosticExportModal.tsx`
- Asegurar layout en columna y altura máxima del modal.
- `ScrollArea` con `overflow-x-hidden` y contenedores con `min-w-0` para evitar overflow.
- Items con `max-w-full overflow-hidden` para que los bordes no “se salgan”.
- Footer con layout responsive (stack en mobile).

### Parte B: Exportación PDF consistente (no blanco)
**Archivo:** `src/components/admin/DiagnosticExportModal.tsx`
- Generar el HTML en un contenedor **offscreen** pero **visible/renderizable** (NO usar `opacity: 0`, `display: none`, `visibility: hidden`).
- Esperar layout/fonts antes de capturar (doble `requestAnimationFrame` + `document.fonts.ready`).
- Mantener page breaks por CSS.

## Pruebas (obligatorias)

### Pruebas funcionales PDF
1. Exportar **1 diagnóstico** (contenido corto):
   - Esperado: se descarga un PDF con título, fecha y contenido visible (no en blanco).
2. Exportar **1 diagnóstico** con **tabla**:
   - Esperado: tabla visible y sin salirse de márgenes.
3. Exportar **2–3 diagnósticos**:
   - Esperado: cada diagnóstico inicia en página nueva (page-break).
4. Exportar diagnóstico con contenido largo (varios párrafos/listas):
   - Esperado: no se corta; páginas adicionales se generan correctamente.

### Pruebas UI modal
1. En viewport mobile (≈390px):
   - Esperado: sin scroll horizontal; filas no se salen; botones visibles dentro del modal.
2. Nombres de emprendimiento muy largos:
   - Esperado: se truncan (no expanden el contenedor).

### Observabilidad
- Ver consola: logs `Export PDF: selectedDiagnosticos` y `Export PDF HTML length` deben aparecer y el HTML length debe ser > 0.
