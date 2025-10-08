-- Agregar columna es_jurado a la tabla mentor_emprendimiento_assignments
ALTER TABLE public.mentor_emprendimiento_assignments 
ADD COLUMN es_jurado boolean NOT NULL DEFAULT false;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.mentor_emprendimiento_assignments.es_jurado IS 'Indica si el mentor es jurado y puede evaluar este emprendimiento';