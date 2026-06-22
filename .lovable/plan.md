## Plan para corregir definitivamente la descarga

El error ya no es autorización: los logs muestran que el usuario admin entra correctamente, pero la Edge Function se apaga por `CPU Time exceeded` mientras descarga/comprime los archivos.

### Cambios propuestos

1. **Optimizar `download-entregas-modulo`**
   - Evitar compresión pesada `DEFLATE` y generar el ZIP con `STORE` para reducir CPU.
   - Agregar límites y logs útiles: número de tareas, entregas, archivos procesados, archivos omitidos y tamaño aproximado.
   - Procesar archivos con una ruta más directa y devolver errores claros si no encuentra archivos descargables.

2. **Mejorar manejo de archivos problemáticos**
   - Registrar cada archivo que falle por path/storage sin tumbar todo el ZIP.
   - Si todos fallan, devolver un mensaje específico con la causa principal en vez de “Error al descargar”.

3. **Mejorar el frontend en `Estudiantes.tsx`**
   - Mostrar el error real que responde la función.
   - Validar que la respuesta sea realmente ZIP antes de crear el blob.
   - Mantener el nombre original del módulo en el ZIP.

4. **Probar la función realmente**
   - Desplegar `download-entregas-modulo`.
   - Ejecutarla con `supabase--curl_edge_functions` usando la sesión actual.
   - Confirmar que devuelve `200` y `application/zip`, o un 4xx/5xx descriptivo si el módulo no tiene archivos descargables.

### Nota técnica

No propongo crear una tabla de trabajos asíncronos todavía porque el cambio mínimo y más probable para resolverlo es eliminar la compresión que está consumiendo CPU. Si aún con ZIP sin compresión el módulo real supera el límite de Edge Functions, el siguiente paso sería implementar descarga asíncrona con estado de job.