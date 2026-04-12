
CREATE OR REPLACE FUNCTION public.calcular_nivel_definitivo(emprendimiento_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  puntaje_promedio NUMERIC;
  nuevo_nivel nivel_emprendimiento;
  has_approved_cupo boolean;
BEGIN
  -- If there's an approved quota, do NOT overwrite nivel_definitivo
  SELECT EXISTS(
    SELECT 1 FROM public.asignacion_cupos
    WHERE emprendimiento_id = emprendimiento_uuid AND estado = 'aprobado'
  ) INTO has_approved_cupo;

  IF has_approved_cupo THEN
    RETURN;
  END IF;

  -- Calculate average score
  SELECT AVG(e.puntaje)
  INTO puntaje_promedio
  FROM public.evaluaciones e
  WHERE e.emprendimiento_id = emprendimiento_uuid
    AND e.puntaje IS NOT NULL;
  
  IF puntaje_promedio IS NULL THEN
    RETURN;
  END IF;
  
  IF puntaje_promedio >= 0 AND puntaje_promedio <= 50 THEN
    nuevo_nivel := 'Starter';
  ELSIF puntaje_promedio > 50 AND puntaje_promedio <= 80 THEN
    nuevo_nivel := 'Growth';
  ELSIF puntaje_promedio > 80 AND puntaje_promedio <= 100 THEN
    nuevo_nivel := 'Scale';
  END IF;
  
  UPDATE public.emprendimientos
  SET nivel_definitivo = nuevo_nivel,
      updated_at = NOW()
  WHERE id = emprendimiento_uuid;
END;
$function$;
