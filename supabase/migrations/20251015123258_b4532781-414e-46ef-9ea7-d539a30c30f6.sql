-- Eliminar trigger de auto-aprobación de evaluaciones CCC
DROP TRIGGER IF EXISTS trigger_auto_aprobar_ccc ON public.evaluaciones;
DROP FUNCTION IF EXISTS public.auto_aprobar_evaluacion_ccc() CASCADE;

-- Eliminar trigger de cálculo de nivel temporalmente
DROP TRIGGER IF EXISTS evaluaciones_calcular_nivel ON public.evaluaciones;

-- Eliminar la policy que depende del campo aprobada_por_admin
DROP POLICY IF EXISTS "Beneficiarios: ver evaluaciones aprobadas" ON public.evaluaciones;

-- Eliminar el campo aprobada_por_admin de la tabla evaluaciones
ALTER TABLE public.evaluaciones DROP COLUMN IF EXISTS aprobada_por_admin;

-- Recrear la policy sin filtrar por aprobación
CREATE POLICY "Beneficiarios: ver evaluaciones visibles"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  is_beneficiario(auth.uid()) 
  AND visible_para_usuario = true 
  AND EXISTS (
    SELECT 1 FROM emprendimientos e 
    WHERE e.id = evaluaciones.emprendimiento_id 
    AND e.user_id = auth.uid()
  )
);

-- Recrear el trigger de cálculo de nivel
CREATE TRIGGER evaluaciones_calcular_nivel
AFTER INSERT OR UPDATE ON public.evaluaciones
FOR EACH ROW
EXECUTE FUNCTION public.trigger_calcular_nivel();

-- Actualizar función get_evaluaciones_aprobadas para no filtrar por aprobación
CREATE OR REPLACE FUNCTION public.get_evaluaciones_aprobadas(emprendimiento_uuid uuid)
RETURNS TABLE(
  id uuid,
  tipo_evaluacion tipo_evaluacion,
  puntaje numeric,
  puntaje_ventas numeric,
  puntaje_innovacion_tecnologia numeric,
  puntaje_equipo numeric,
  puntaje_impacto numeric,
  puntaje_referido_regional numeric,
  mentor_id uuid,
  nivel nivel_emprendimiento,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
  ORDER BY created_at ASC;
$$;

-- Actualizar función calcular_nivel_definitivo para no filtrar por aprobación
CREATE OR REPLACE FUNCTION public.calcular_nivel_definitivo(emprendimiento_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  puntaje_promedio NUMERIC;
  nuevo_nivel nivel_emprendimiento;
BEGIN
  -- Calcular puntaje promedio de todas las evaluaciones
  SELECT AVG(e.puntaje)
  INTO puntaje_promedio
  FROM public.evaluaciones e
  WHERE e.emprendimiento_id = emprendimiento_uuid
    AND e.puntaje IS NOT NULL;
  
  -- Si no hay evaluaciones, salir sin actualizar
  IF puntaje_promedio IS NULL THEN
    RETURN;
  END IF;
  
  -- Determinar nivel según el puntaje
  IF puntaje_promedio >= 0 AND puntaje_promedio <= 50 THEN
    nuevo_nivel := 'Starter';
  ELSIF puntaje_promedio > 50 AND puntaje_promedio <= 80 THEN
    nuevo_nivel := 'Growth';
  ELSIF puntaje_promedio > 80 AND puntaje_promedio <= 100 THEN
    nuevo_nivel := 'Scale';
  END IF;
  
  -- Actualizar nivel definitivo
  UPDATE public.emprendimientos
  SET nivel_definitivo = nuevo_nivel,
      updated_at = NOW()
  WHERE id = emprendimiento_uuid;
END;
$$;