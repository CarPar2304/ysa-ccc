-- Modificar tipo_reaccion para aceptar emojis
ALTER TABLE public.reacciones 
ALTER COLUMN tipo_reaccion TYPE text,
ALTER COLUMN tipo_reaccion SET DEFAULT '👍';