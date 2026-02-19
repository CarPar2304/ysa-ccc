
-- Create enum for afiliacion_comfandi with short labels
CREATE TYPE public.afiliacion_comfandi AS ENUM (
  'Afiliada como empresa',
  'En proceso o con interés',
  'Afiliado a otra caja',
  'Afiliado como independiente'
);

-- Add column to emprendimientos
ALTER TABLE public.emprendimientos
ADD COLUMN afiliacion_comfandi public.afiliacion_comfandi DEFAULT NULL;
