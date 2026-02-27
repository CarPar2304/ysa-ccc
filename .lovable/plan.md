

# Plan: Mejoras al Sistema de Asistencia y Cohortes en Clases

## Resumen
Cuatro cambios principales: (1) mover el AttendanceManager al sidebar derecho, (2) agregar campo de cohorte a las clases, (3) agregar seccion de asistentes manuales del mismo nivel/cohorte que no cruzaron por correo, (4) confirmar visibilidad solo para admin y operadores.

## Cambios

### 1. Mover AttendanceManager al sidebar (debajo de "Contenido del curso")
- En `LabClassView.tsx`, quitar el `AttendanceManager` del area principal (col-span-2) y moverlo al sidebar (col-span-1), debajo de la card de "Contenido del curso"
- Solo visible para `isAdmin || isOperador`

### 2. Agregar campo `cohorte` a la tabla `clases`
- Migracion SQL: `ALTER TABLE clases ADD COLUMN cohorte integer[] DEFAULT '{1}'`
- Para clases de modulos Starter/Growth, se puede elegir cohorte 1, 2, o ambas
- Para clases de modulos Scale, por defecto cohorte 1 (solo hay una)

### 3. Agregar selector de cohorte en ClassEditor
- En `ClassEditor.tsx`, agregar un selector de cohorte(s) con checkboxes
- Necesita conocer el nivel del modulo para determinar las opciones disponibles
- Si nivel es Scale: solo cohorte 1 (automatico)
- Si nivel es Starter o Growth: opciones para cohorte 1, 2, o ambas

### 4. Agregar asistentes manuales en AttendanceManager
- Despues de validar correos, mostrar una seccion adicional con los estudiantes del nivel/cohorte de la clase que NO aparecieron en los correos pegados y que NO tienen asistencia previa
- Se obtienen consultando `asignacion_cupos` filtrando por nivel del modulo y cohorte de la clase
- Se muestran con checkbox para poder agregarlos manualmente
- Al guardar, se incluyen tanto los validados por correo como los agregados manualmente

### 5. Pasar informacion de cohorte y nivel al AttendanceManager
- Nuevas props: `cohortes: number[]`, `nivelModulo: string`
- Estas se obtienen del modulo y la clase en `LabClassView.tsx`

## Detalles tecnicos

### Migracion SQL
```sql
ALTER TABLE public.clases ADD COLUMN cohorte integer[] DEFAULT '{1}';
```

### Archivos a modificar
1. **Migracion SQL** -- agregar columna `cohorte` a `clases`
2. **`src/components/lab/ClassEditor.tsx`** -- agregar selector de cohorte, necesita recibir `nivelModulo` como prop
3. **`src/pages/LabClassView.tsx`** -- mover AttendanceManager al sidebar, fetch nivel del modulo, pasar cohorte/nivel al AttendanceManager
4. **`src/components/lab/AttendanceManager.tsx`** -- recibir cohortes y nivel, agregar seccion de asistentes manuales (estudiantes del nivel/cohorte que no cruzaron)
5. **`src/pages/LabModuleView.tsx`** -- pasar `nivelModulo` al ClassEditor

### Flujo de asistentes manuales
```text
1. Admin/operador pega correos y valida
2. Se muestran: validados, no encontrados
3. Se consultan todos los estudiantes del nivel+cohorte de la clase
4. Se restan los ya validados y los ya registrados
5. Se muestran como "Asistentes adicionales" con checkboxes
6. Al guardar, se incluyen ambos grupos
```

### Consulta de estudiantes del nivel/cohorte
```sql
SELECT u.id, u.email, u.nombres, u.apellidos, e.nombre as emprendimiento
FROM usuarios u
JOIN emprendimientos e ON e.user_id = u.id
JOIN asignacion_cupos ac ON ac.emprendimiento_id = e.id
WHERE ac.estado = 'aprobado'
  AND ac.nivel = :nivelModulo
  AND ac.cohorte = ANY(:cohortes)
```
