

# Plan: Botón de Actualización de Datos en Candidatos

## Resumen
Crear un sistema de actualización de datos con dos modos (masivo e individual) y una función especial para actualizar correo/contraseña via edge function con service_role.

## Componentes a crear

### 1. `UpdateDataModal.tsx` (nuevo componente en `src/components/candidatos/`)
Modal principal con dos tabs:
- **Masiva**: Seleccionar campos a actualizar → descargar plantilla Excel (siempre con columna email + campos seleccionados) → cargar Excel con datos → validar emails contra BD → mostrar cuáles cruzaron/no cruzaron → confirmar actualización solo de los que cruzaron
- **Individual**: Buscar/seleccionar un candidato → editar los campos seleccionados directamente en un formulario → guardar

**Campos disponibles para actualización masiva/individual:**
- Datos de usuario: nombres, apellidos, celular, numero_identificacion, departamento, municipio, genero, direccion, ano_nacimiento, etc.
- Datos de emprendimiento: nombre, nit, como_se_entero, categoria, etapa, pagina_web, industria_vertical, etc.

### 2. `UpdateCredentialsModal.tsx` (nuevo componente en `src/components/candidatos/`)
Modal separado para actualizar email y/o contraseña de un usuario:
- Buscar usuario por email actual
- Campos: nuevo email, nueva contraseña (opcionales, al menos uno)
- Al guardar, llama a una edge function que usa `service_role` para:
  - `supabase.auth.admin.updateUserById()` para actualizar email/contraseña en auth sin enviar notificación
  - Actualizar el campo `email` en la tabla `usuarios` si se cambió el correo

### 3. Edge Function `update-user-credentials` (nuevo)
- Recibe: `user_id`, `new_email?`, `new_password?`
- Valida que el caller sea admin (verifica JWT + role)
- Usa `supabase.auth.admin.updateUserById(user_id, { email, password, email_confirm: true })` con `email_confirm: true` para que no envíe correo de confirmación
- Si se cambió email, también hace `UPDATE usuarios SET email = new_email WHERE id = user_id`

### 4. Integración en `CandidatosList.tsx`
- Agregar botón "Actualizar Datos" junto a los botones existentes (Actualizar, Exportar)
- Dropdown o modal que permita elegir: "Actualización masiva", "Actualización individual", "Cambiar correo/contraseña"

## Flujo de actualización masiva

```text
1. Admin abre modal → selecciona campos (ej: NIT, como_se_entero)
2. Descarga plantilla Excel con columnas: Email, NIT, Por dónde se enteró
3. Llena la plantilla con datos
4. Carga el Excel
5. Sistema lee emails, cruza contra tabla usuarios
6. Muestra: X emails encontrados, Y no encontrados (lista de ambos)
7. Admin confirma → se actualizan solo los registros que cruzaron
8. Resultado: X actualizados, Y ignorados
```

## Flujo de actualización de credenciales

```text
1. Admin busca usuario por email
2. Ingresa nuevo email y/o nueva contraseña
3. Confirma → edge function actualiza auth + BD
4. No se envía ningún correo al usuario
```

## Archivos a crear/modificar
1. **Crear** `src/components/candidatos/UpdateDataModal.tsx` -- modal con tabs masiva/individual
2. **Crear** `src/components/candidatos/UpdateCredentialsModal.tsx` -- modal para email/contraseña
3. **Crear** `supabase/functions/update-user-credentials/index.ts` -- edge function con service_role
4. **Modificar** `supabase/config.toml` -- agregar config para la nueva edge function con `verify_jwt = false`
5. **Modificar** `src/components/candidatos/CandidatosList.tsx` -- agregar botón y estados para los nuevos modales

## Detalles técnicos

### Edge function `update-user-credentials`
- Verificación manual de JWT del caller
- Verificación de que el caller tiene rol admin via query a `user_roles`
- Usa `SUPABASE_SERVICE_ROLE_KEY` (ya existe como secret)
- `updateUserById` con `email_confirm: true` evita envío de correo de confirmación

### Actualización masiva - lógica de cruce
- Lee Excel con `xlsx` (ya instalado)
- Normaliza emails (lowercase, trim)
- Query a `usuarios` para encontrar IDs por email
- Para campos de `usuarios`: update directo
- Para campos de `emprendimientos`: buscar emprendimiento por user_id, luego update

