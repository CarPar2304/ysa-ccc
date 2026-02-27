

# Plan: Sistema de Asistencia por Correos

## Resumen
Reemplazar el botón de "Marcar como completada" (autoservicio del estudiante) por un sistema donde los mentores operadores y admins registran la asistencia pegando correos electrónicos de los asistentes a cada clase.

## Cambios principales

### 1. Quitar el botón de "Marcar como completada"
- En `LabClassView.tsx`, eliminar el checkbox de completado y toda la lógica asociada (`handleToggleCompletado`, estado `completado`, la query de progreso).

### 2. Crear componente de Registro de Asistencia
- Nuevo componente `src/components/lab/AttendanceManager.tsx`
- Visible solo para admin y mentores operadores (que tengan el nivel del modulo)
- Contiene:
  - Un `<textarea>` donde se pegan correos (separados por coma, salto de linea, o punto y coma)
  - Boton "Validar" que cruza los correos con la tabla `usuarios`
  - Muestra resultados: cuantos encontrados, cuantos no encontrados, y lista de los no encontrados
  - Los encontrados se muestran con nombre y emprendimiento
  - Los que ya tienen asistencia registrada se muestran como "ya registrados"
  - Boton "Guardar Asistencia" que inserta/actualiza registros en `progreso_usuario` con `completado = true`

### 3. Integrar el componente en LabClassView
- Agregar el `AttendanceManager` en la vista de clase (debajo del contenido), visible solo para admin/operadores
- Se pasa `claseId` y `moduloId` como props

### 4. La pagina de Estudiantes sigue funcionando igual
- Ya lee de `progreso_usuario` para calcular el progreso por modulo
- Al guardar asistencia clase por clase, el porcentaje de progreso se calcula automaticamente (clases completadas / total clases)

## Detalles tecnicos

### Flujo de validacion de correos
```text
1. Usuario pega correos en textarea
2. Click "Validar"
3. Query: SELECT id, email, nombres, apellidos FROM usuarios WHERE email IN (...)
4. Cruzar con emprendimientos para mostrar nombre del emprendimiento
5. Separar en: encontrados vs no encontrados
6. Mostrar resultados con checkboxes (todos pre-seleccionados)
7. Click "Guardar Asistencia"
8. UPSERT en progreso_usuario para cada usuario seleccionado
```

### Componente AttendanceManager
- Props: `claseId: string`, `moduloId: string`
- Estados: emails raw text, validated results, loading states
- Muestra asistencias ya registradas para esa clase
- Permite agregar nuevas asistencias sin borrar las existentes

### Permisos
- Se reutiliza la logica existente de `useUserRole` (isAdmin, isOperador) y `can_edit_modulo`
- La tabla `progreso_usuario` ya permite INSERT/UPDATE para admins (RLS existente)
- Se necesita agregar una politica RLS para que operadores puedan insertar/actualizar progreso de usuarios de su nivel

### Migracion SQL necesaria
- Agregar politica RLS en `progreso_usuario` para operadores:
  ```sql
  CREATE POLICY "Operadores: gestionar progreso de su nivel"
  ON public.progreso_usuario
  FOR ALL
  TO authenticated
  USING (
    is_operador(auth.uid()) AND user_id IN (
      SELECT e.user_id FROM emprendimientos e
      WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
    )
  )
  WITH CHECK (
    is_operador(auth.uid()) AND user_id IN (
      SELECT e.user_id FROM emprendimientos e
      WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
    )
  );
  ```

### Archivos a modificar
1. **`src/pages/LabClassView.tsx`** -- Quitar checkbox completado, agregar AttendanceManager
2. **`src/components/lab/AttendanceManager.tsx`** -- Nuevo componente
3. **Migracion SQL** -- RLS para operadores en progreso_usuario

### Sin cambios en Estudiantes
La pagina de Estudiantes (`src/pages/Estudiantes.tsx`) ya calcula el progreso leyendo `progreso_usuario` por clase, asi que reflejara automaticamente las asistencias guardadas.
