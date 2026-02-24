
ALTER TABLE public.noticias
ADD COLUMN niveles_acceso text[] DEFAULT NULL,
ADD COLUMN cohortes_acceso integer[] DEFAULT NULL;
