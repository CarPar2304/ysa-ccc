ALTER TABLE public.clases
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS hora_inicio time,
  ADD COLUMN IF NOT EXISTS hora_fin time,
  ADD COLUMN IF NOT EXISTS modalidad text,
  ADD COLUMN IF NOT EXISTS lugar text,
  ADD COLUMN IF NOT EXISTS link_virtual text;

CREATE INDEX IF NOT EXISTS idx_clases_fecha ON public.clases (fecha) WHERE fecha IS NOT NULL;