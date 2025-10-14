-- Eliminar campos enum redundantes que solo usaban los booleanos cumple_*
ALTER TABLE public.evaluaciones
  DROP COLUMN IF EXISTS ubicacion,
  DROP COLUMN IF EXISTS interes,
  DROP COLUMN IF EXISTS equipo,
  DROP COLUMN IF EXISTS dedicacion;

-- Comentario actualizado para clarificar que solo usamos booleanos
COMMENT ON COLUMN public.evaluaciones.cumple_ubicacion IS 'Requisito habilitante: Emprendedor en jurisdicción CCC o suroccidente';
COMMENT ON COLUMN public.evaluaciones.cumple_interes IS 'Requisito habilitante: Interés del emprendimiento';
COMMENT ON COLUMN public.evaluaciones.cumple_dedicacion IS 'Requisito habilitante: Al menos 1 persona dedicada 100%';
COMMENT ON COLUMN public.evaluaciones.cumple_equipo_minimo IS 'Requisito habilitante: Equipo de al menos 2 personas';