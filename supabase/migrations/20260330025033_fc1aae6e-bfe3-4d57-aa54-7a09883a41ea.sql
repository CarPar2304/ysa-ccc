ALTER TABLE public.noticias 
  ADD COLUMN IF NOT EXISTS es_evento boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_evento date,
  ADD COLUMN IF NOT EXISTS hora_inicio_evento time without time zone,
  ADD COLUMN IF NOT EXISTS hora_fin_evento time without time zone,
  ADD COLUMN IF NOT EXISTS lugar_evento text,
  ADD COLUMN IF NOT EXISTS link_virtual_evento text,
  ADD COLUMN IF NOT EXISTS modalidad_evento text,
  ADD COLUMN IF NOT EXISTS evento_calendario_id uuid REFERENCES public.eventos_calendario(id) ON DELETE SET NULL;