-- Drop incorrect unique constraint that blocks multiple evaluations per emprendimiento
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'evaluaciones_emprendimiento_id_key'
  ) THEN
    ALTER TABLE public.evaluaciones DROP CONSTRAINT evaluaciones_emprendimiento_id_key;
  END IF;
END $$;

-- Ensure only one CCC evaluation per emprendimiento (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ccc_per_emprendimiento
ON public.evaluaciones (emprendimiento_id)
WHERE tipo_evaluacion = 'ccc';