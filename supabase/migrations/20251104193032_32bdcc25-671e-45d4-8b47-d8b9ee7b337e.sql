-- Agregar campo nivel_ingles a tabla usuarios
ALTER TABLE public.usuarios 
ADD COLUMN nivel_ingles text;

-- Agregar campos pagina_web y ano_fundacion a tabla emprendimientos
ALTER TABLE public.emprendimientos 
ADD COLUMN pagina_web text,
ADD COLUMN ano_fundacion integer;