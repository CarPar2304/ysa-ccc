Plan de corrección definitiva:

1. **Descarga de entregables sin falso “No autorizado”**
   - Cambiar la función `download-entregas-modulo` a un patrón robusto de dos clientes:
     - validar el JWT con el cliente de usuario usando el `Authorization` recibido;
     - verificar permisos con `user_roles` vía service role;
     - permitir explícitamente `admin`, `mentor_operador` y `mentor`.
   - Eliminar dependencias frágiles de `admin.auth.getUser(token)` como único camino de autenticación.
   - Mejorar respuestas de error para distinguir: sin sesión, token inválido, usuario sin rol, módulo sin tareas o archivos no encontrados.
   - Asegurar que el frontend envíe `Authorization`, `apikey` y use la URL/configuración correcta del proyecto.
   - Desplegar y probar la edge function contra el entorno real.

2. **Validación de asistencia por número de identificación**
   - Agregar un tercer campo en `AttendanceManager`: “Números de identificación”.
   - Buscar usuarios por `usuarios.numero_identificacion`, normalizando espacios, puntos, guiones y separadores.
   - Mezclar resultados con los ya encontrados por correo y emprendimiento sin duplicados.
   - Mostrar el origen como `Identificación` en los resultados.
   - Enviar también los identificadores no encontrados al análisis IA.

3. **Arreglar análisis con IA y darle contexto real**
   - Reforzar `match-asistencia-ia` para usar únicamente `OPENAI_API_KEY` desde secretos y fallar con mensaje claro si no existe.
   - Enviar al modelo un catálogo más completo por nivel/cohorte:
     - nombre del emprendimiento;
     - cohorte y nivel;
     - dueño: nombre, email y número de identificación;
     - cofundadores: nombre, email y número de identificación.
   - Separar los ítems no encontrados por tipo (`email`, `emprendimiento`, `identificacion`) para que el modelo sepa qué está cruzando.
   - Usar un formato JSON estricto y validar la respuesta antes de devolverla al frontend.
   - Si OpenAI devuelve error, mostrar en la UI un mensaje útil en vez de solo “Edge Function returned a non-2xx status code”.

4. **Verificación**
   - Revisar logs de ambas edge functions después del despliegue.
   - Probar `match-asistencia-ia` con payload real/simulado.
   - Probar descarga de entregables con sesión autenticada y confirmar que el admin `carlosparedesmiranda@gmail.com` está reconocido como `admin`.