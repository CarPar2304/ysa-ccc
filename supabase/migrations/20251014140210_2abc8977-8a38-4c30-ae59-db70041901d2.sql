-- 1. Crear ENUM para tipo_evaluacion
CREATE TYPE public.tipo_evaluacion AS ENUM ('ccc', 'jurado');

-- 2. Agregar nuevas columnas a la tabla evaluaciones
ALTER TABLE public.evaluaciones
  ADD COLUMN tipo_evaluacion public.tipo_evaluacion NOT NULL DEFAULT 'jurado',
  ADD COLUMN aprobada_por_admin boolean DEFAULT NULL,
  ADD COLUMN evaluacion_base_id uuid REFERENCES public.evaluaciones(id) ON DELETE SET NULL;

-- 3. Actualizar evaluaciones existentes (todas son de tipo 'jurado' por ahora)
UPDATE public.evaluaciones 
SET tipo_evaluacion = 'jurado', 
    aprobada_por_admin = true
WHERE mentor_id IS NOT NULL;

-- 4. Crear índices para optimizar consultas
CREATE INDEX idx_evaluaciones_tipo ON public.evaluaciones(tipo_evaluacion);
CREATE INDEX idx_evaluaciones_aprobada ON public.evaluaciones(aprobada_por_admin) WHERE aprobada_por_admin IS NOT NULL;
CREATE INDEX idx_evaluaciones_base_id ON public.evaluaciones(evaluacion_base_id) WHERE evaluacion_base_id IS NOT NULL;

-- 5. Crear función para obtener evaluaciones aprobadas
CREATE OR REPLACE FUNCTION public.get_evaluaciones_aprobadas(emprendimiento_uuid uuid)
RETURNS TABLE (
  id uuid,
  tipo_evaluacion public.tipo_evaluacion,
  puntaje numeric,
  puntaje_ventas numeric,
  puntaje_innovacion_tecnologia numeric,
  puntaje_equipo numeric,
  puntaje_impacto numeric,
  puntaje_referido_regional numeric,
  mentor_id uuid,
  nivel public.nivel_emprendimiento,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    tipo_evaluacion,
    puntaje,
    puntaje_ventas,
    puntaje_innovacion_tecnologia,
    puntaje_equipo,
    puntaje_impacto,
    puntaje_referido_regional,
    mentor_id,
    nivel,
    created_at
  FROM public.evaluaciones
  WHERE emprendimiento_id = emprendimiento_uuid
    AND visible_para_usuario = true
    AND (
      tipo_evaluacion = 'ccc' 
      OR (tipo_evaluacion = 'jurado' AND aprobada_por_admin = true)
    )
  ORDER BY created_at ASC;
$$;

-- 6. Actualizar RLS Policies

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Admins tienen acceso completo a evaluaciones" ON public.evaluaciones;
DROP POLICY IF EXISTS "Beneficiarios pueden ver evaluaciones visibles de su emprendimi" ON public.evaluaciones;
DROP POLICY IF EXISTS "Evaluaciones: delete solo admin" ON public.evaluaciones;
DROP POLICY IF EXISTS "Mentores pueden actualizar sus evaluaciones si permitido" ON public.evaluaciones;
DROP POLICY IF EXISTS "Mentores pueden crear evaluaciones para emprendimientos asignad" ON public.evaluaciones;
DROP POLICY IF EXISTS "Mentores pueden ver sus propias evaluaciones" ON public.evaluaciones;

-- Crear nuevas políticas

-- Admins: acceso total
CREATE POLICY "Admins: acceso completo a evaluaciones"
ON public.evaluaciones
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Beneficiarios: solo ven evaluaciones aprobadas y visibles
CREATE POLICY "Beneficiarios: ver evaluaciones aprobadas"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  is_beneficiario(auth.uid())
  AND visible_para_usuario = true
  AND (
    tipo_evaluacion = 'ccc'
    OR (tipo_evaluacion = 'jurado' AND aprobada_por_admin = true)
  )
  AND EXISTS (
    SELECT 1 FROM emprendimientos e
    WHERE e.id = evaluaciones.emprendimiento_id
      AND e.user_id = auth.uid()
  )
);

-- Mentores: pueden ver sus propias evaluaciones
CREATE POLICY "Mentores: ver propias evaluaciones"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  is_mentor(auth.uid())
  AND mentor_id = auth.uid()
);

-- Mentores: pueden crear evaluaciones tipo jurado
CREATE POLICY "Mentores: crear evaluaciones jurado"
ON public.evaluaciones
FOR INSERT
TO authenticated
WITH CHECK (
  is_mentor(auth.uid())
  AND mentor_id = auth.uid()
  AND tipo_evaluacion = 'jurado'
  AND EXISTS (
    SELECT 1 FROM mentor_emprendimiento_assignments mea
    WHERE mea.mentor_id = auth.uid()
      AND mea.emprendimiento_id = evaluaciones.emprendimiento_id
      AND mea.activo = true
  )
);

-- Mentores: pueden actualizar sus evaluaciones si tienen permiso
CREATE POLICY "Mentores: actualizar propias evaluaciones"
ON public.evaluaciones
FOR UPDATE
TO authenticated
USING (
  is_mentor(auth.uid())
  AND mentor_id = auth.uid()
  AND puede_editar = true
  AND tipo_evaluacion = 'jurado'
)
WITH CHECK (
  is_mentor(auth.uid())
  AND mentor_id = auth.uid()
  AND puede_editar = true
  AND tipo_evaluacion = 'jurado'
);

-- Admins: pueden eliminar evaluaciones
CREATE POLICY "Admins: delete evaluaciones"
ON public.evaluaciones
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- 7. Crear trigger para auto-aprobar evaluaciones CCC
CREATE OR REPLACE FUNCTION public.auto_aprobar_evaluacion_ccc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si es evaluación CCC, auto-aprobar
  IF NEW.tipo_evaluacion = 'ccc' THEN
    NEW.aprobada_por_admin := true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_aprobar_ccc
  BEFORE INSERT ON public.evaluaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_aprobar_evaluacion_ccc();

-- 8. Comentarios en la tabla para documentación
COMMENT ON COLUMN public.evaluaciones.tipo_evaluacion IS 'Tipo de evaluación: ccc (preliminar automática) o jurado (evaluación manual)';
COMMENT ON COLUMN public.evaluaciones.aprobada_por_admin IS 'NULL = pendiente, true = aprobada, false = rechazada. Solo aplica para tipo jurado.';
COMMENT ON COLUMN public.evaluaciones.evaluacion_base_id IS 'Referencia a la evaluación CCC sobre la que se basa (solo para tipo jurado)';
COMMENT ON COLUMN public.evaluaciones.nivel IS 'Nivel del emprendimiento evaluado: alto, medio o bajo';