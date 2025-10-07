-- Eliminar la columna genero y agregar la columna celular en autorizaciones
ALTER TABLE public.autorizaciones 
DROP COLUMN IF EXISTS genero;

ALTER TABLE public.autorizaciones 
ADD COLUMN celular boolean NOT NULL DEFAULT false;