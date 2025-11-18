-- Agregar columna imagen_url a la tabla clases si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clases' 
    AND column_name = 'imagen_url'
  ) THEN
    ALTER TABLE public.clases ADD COLUMN imagen_url text;
  END IF;
END $$;