
-- Añadir tipo de disponibilidad y link de calendario externo a perfiles_asesoria
ALTER TABLE public.perfiles_asesoria
  ADD COLUMN IF NOT EXISTS tipo_disponibilidad text NOT NULL DEFAULT 'slots' CHECK (tipo_disponibilidad IN ('slots', 'calendario_externo')),
  ADD COLUMN IF NOT EXISTS link_calendario_externo text NULL;

-- Añadir columna para marcar reservas hechas por calendario externo
ALTER TABLE public.reservas_asesoria
  ADD COLUMN IF NOT EXISTS tipo_reserva text NOT NULL DEFAULT 'normal' CHECK (tipo_reserva IN ('normal', 'calendario_externo'));
