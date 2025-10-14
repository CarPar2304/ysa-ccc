-- Agregar campos de Proyección y Financiación a la tabla evaluaciones
-- Campo de puntaje (máximo 5 puntos)
ALTER TABLE public.evaluaciones
ADD COLUMN puntaje_proyeccion_financiacion numeric CHECK (puntaje_proyeccion_financiacion >= 0 AND puntaje_proyeccion_financiacion <= 5);

-- Campo de texto para comentarios del mentor-jurado
ALTER TABLE public.evaluaciones
ADD COLUMN proyeccion_financiacion_texto text;

-- Agregar comentarios a las columnas para documentación
COMMENT ON COLUMN public.evaluaciones.puntaje_proyeccion_financiacion IS 'Puntaje de Proyección y Financiación (máximo 5 puntos)';
COMMENT ON COLUMN public.evaluaciones.proyeccion_financiacion_texto IS 'Comentarios del mentor-jurado sobre Proyección y Financiación';