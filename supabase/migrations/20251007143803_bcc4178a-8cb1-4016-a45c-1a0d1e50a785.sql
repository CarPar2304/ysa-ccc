-- Agregar columnas necesarias a la tabla evaluaciones
ALTER TABLE public.evaluaciones
ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS puntaje_impacto numeric CHECK (puntaje_impacto >= 0 AND puntaje_impacto <= 30),
ADD COLUMN IF NOT EXISTS puntaje_equipo numeric CHECK (puntaje_equipo >= 0 AND puntaje_equipo <= 25),
ADD COLUMN IF NOT EXISTS puntaje_innovacion_tecnologia numeric CHECK (puntaje_innovacion_tecnologia >= 0 AND puntaje_innovacion_tecnologia <= 25),
ADD COLUMN IF NOT EXISTS puntaje_ventas numeric CHECK (puntaje_ventas >= 0 AND puntaje_ventas <= 25),
ADD COLUMN IF NOT EXISTS puntaje_referido_regional numeric CHECK (puntaje_referido_regional >= 0 AND puntaje_referido_regional <= 5),
ADD COLUMN IF NOT EXISTS cumple_ubicacion boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cumple_equipo_minimo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cumple_dedicacion boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cumple_interes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS comentarios_adicionales text,
ADD COLUMN IF NOT EXISTS puede_editar boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS estado text CHECK (estado IN ('borrador', 'enviada')) DEFAULT 'borrador';

-- Actualizar el cálculo del puntaje total para que sea la suma de los puntajes individuales
-- El campo 'puntaje' será calculado automáticamente

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_evaluaciones_mentor_id ON public.evaluaciones(mentor_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_emprendimiento_id ON public.evaluaciones(emprendimiento_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estado ON public.evaluaciones(estado);

-- Actualizar políticas RLS para evaluaciones

-- Eliminar políticas existentes relacionadas con evaluaciones
DROP POLICY IF EXISTS "Evaluaciones: insertar solo admin" ON public.evaluaciones;
DROP POLICY IF EXISTS "Evaluaciones: update solo admin" ON public.evaluaciones;
DROP POLICY IF EXISTS "Evaluaciones: ver si visible para usuario dueño o admin" ON public.evaluaciones;

-- Mentores pueden crear evaluaciones para emprendimientos asignados
CREATE POLICY "Mentores pueden crear evaluaciones para emprendimientos asignados"
ON public.evaluaciones
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_mentor(auth.uid()) AND 
  mentor_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.mentor_emprendimiento_assignments mea
    WHERE mea.mentor_id = auth.uid() 
    AND mea.emprendimiento_id = evaluaciones.emprendimiento_id 
    AND mea.activo = true
  )
);

-- Mentores pueden ver sus propias evaluaciones
CREATE POLICY "Mentores pueden ver sus propias evaluaciones"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  public.is_mentor(auth.uid()) AND mentor_id = auth.uid()
);

-- Mentores pueden actualizar sus propias evaluaciones si puede_editar = true
CREATE POLICY "Mentores pueden actualizar sus evaluaciones si permitido"
ON public.evaluaciones
FOR UPDATE
TO authenticated
USING (
  public.is_mentor(auth.uid()) AND 
  mentor_id = auth.uid() AND 
  puede_editar = true
)
WITH CHECK (
  public.is_mentor(auth.uid()) AND 
  mentor_id = auth.uid() AND 
  puede_editar = true
);

-- Beneficiarios pueden ver evaluaciones de su emprendimiento si visible_para_usuario = true
CREATE POLICY "Beneficiarios pueden ver evaluaciones visibles de su emprendimiento"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  public.is_beneficiario(auth.uid()) AND
  visible_para_usuario = true AND
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = evaluaciones.emprendimiento_id 
    AND e.user_id = auth.uid()
  )
);

-- Admins tienen acceso completo
CREATE POLICY "Admins tienen acceso completo a evaluaciones"
ON public.evaluaciones
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Crear vista para calcular puntajes promedio por emprendimiento
CREATE OR REPLACE VIEW public.evaluaciones_promedio AS
SELECT 
  e.emprendimiento_id,
  COUNT(*) FILTER (WHERE e.estado = 'enviada') as evaluaciones_completadas,
  AVG(
    COALESCE(e.puntaje_impacto, 0) + 
    COALESCE(e.puntaje_equipo, 0) + 
    COALESCE(e.puntaje_innovacion_tecnologia, 0) + 
    COALESCE(e.puntaje_ventas, 0) + 
    COALESCE(e.puntaje_referido_regional, 0)
  ) FILTER (WHERE e.estado = 'enviada') as puntaje_promedio,
  SUM(
    COALESCE(e.puntaje_impacto, 0) + 
    COALESCE(e.puntaje_equipo, 0) + 
    COALESCE(e.puntaje_innovacion_tecnologia, 0) + 
    COALESCE(e.puntaje_ventas, 0) + 
    COALESCE(e.puntaje_referido_regional, 0)
  ) FILTER (WHERE e.estado = 'enviada') as puntaje_total
FROM public.evaluaciones e
GROUP BY e.emprendimiento_id;

-- Permitir que todos los usuarios autenticados vean la vista de promedios
GRANT SELECT ON public.evaluaciones_promedio TO authenticated;