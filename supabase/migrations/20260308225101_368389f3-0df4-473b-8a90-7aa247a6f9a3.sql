
-- Add tracking/origin fields to usuarios table
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS como_se_entero text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS camara_aliada text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS universidad text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS otra_institucion text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS red_social text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS creador_contenido text;
