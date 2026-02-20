-- Agregar columnas de control de audiencia a perfiles_asesoria
ALTER TABLE public.perfiles_asesoria
  ADD COLUMN IF NOT EXISTS niveles_acceso text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cohortes_acceso integer[] DEFAULT NULL;

COMMENT ON COLUMN public.perfiles_asesoria.niveles_acceso IS 'Niveles de emprendimiento que pueden ver este perfil. NULL = todos los niveles.';
COMMENT ON COLUMN public.perfiles_asesoria.cohortes_acceso IS 'Cohortes que pueden ver este perfil. NULL = todas las cohortes.';