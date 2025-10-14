-- 1. Agregar columna nivel_definitivo a emprendimientos
ALTER TABLE public.emprendimientos 
ADD COLUMN IF NOT EXISTS nivel_definitivo nivel_emprendimiento;

-- 2. Crear tabla asignacion_cupos
CREATE TABLE IF NOT EXISTS public.asignacion_cupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID REFERENCES public.emprendimientos(id) ON DELETE CASCADE NOT NULL,
  nivel nivel_emprendimiento NOT NULL,
  cohorte INTEGER NOT NULL CHECK (cohorte IN (1, 2)),
  fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aprobado_por UUID REFERENCES auth.users(id),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(emprendimiento_id)
);

-- 3. Habilitar RLS en asignacion_cupos
ALTER TABLE public.asignacion_cupos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para asignacion_cupos
CREATE POLICY "Admins tienen acceso completo a asignacion_cupos"
ON public.asignacion_cupos
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Beneficiarios pueden ver su asignación"
ON public.asignacion_cupos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = asignacion_cupos.emprendimiento_id
    AND e.user_id = auth.uid()
  )
);

-- 5. Función para calcular y actualizar nivel definitivo
CREATE OR REPLACE FUNCTION public.calcular_nivel_definitivo(emprendimiento_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  puntaje_promedio NUMERIC;
  nuevo_nivel nivel_emprendimiento;
BEGIN
  -- Calcular puntaje promedio de evaluaciones aprobadas
  SELECT AVG(e.puntaje)
  INTO puntaje_promedio
  FROM public.evaluaciones e
  WHERE e.emprendimiento_id = emprendimiento_uuid
    AND e.puntaje IS NOT NULL
    AND (
      e.tipo_evaluacion = 'ccc' 
      OR (e.tipo_evaluacion = 'jurado' AND e.aprobada_por_admin = true)
    );
  
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

-- 6. Trigger para calcular nivel definitivo automáticamente
CREATE OR REPLACE FUNCTION public.trigger_calcular_nivel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ejecutar cálculo de nivel definitivo
  PERFORM public.calcular_nivel_definitivo(COALESCE(NEW.emprendimiento_id, OLD.emprendimiento_id));
  RETURN NEW;
END;
$$;

-- Crear trigger en evaluaciones
DROP TRIGGER IF EXISTS evaluaciones_calcular_nivel ON public.evaluaciones;
CREATE TRIGGER evaluaciones_calcular_nivel
AFTER INSERT OR UPDATE OF puntaje, aprobada_por_admin, tipo_evaluacion
ON public.evaluaciones
FOR EACH ROW
EXECUTE FUNCTION public.trigger_calcular_nivel();

-- 7. Trigger para updated_at en asignacion_cupos
CREATE TRIGGER update_asignacion_cupos_updated_at
BEFORE UPDATE ON public.asignacion_cupos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 8. Calcular nivel definitivo para emprendimientos existentes con evaluaciones
DO $$
DECLARE
  emp_record RECORD;
BEGIN
  FOR emp_record IN 
    SELECT DISTINCT e.emprendimiento_id 
    FROM public.evaluaciones e
    WHERE e.puntaje IS NOT NULL
  LOOP
    PERFORM public.calcular_nivel_definitivo(emp_record.emprendimiento_id);
  END LOOP;
END $$;