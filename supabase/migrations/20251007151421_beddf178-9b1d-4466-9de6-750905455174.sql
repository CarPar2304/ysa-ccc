-- Política para que mentores vean equipos de emprendimientos asignados
CREATE POLICY "Equipos: mentores pueden ver asignados"
ON public.equipos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = equipos.emprendimiento_id
      AND public.mentor_has_emprendimiento(auth.uid(), e.id)
  )
);

-- Política para que mentores vean financiamientos de emprendimientos asignados
CREATE POLICY "Financiamientos: mentores pueden ver asignados"
ON public.financiamientos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = financiamientos.emprendimiento_id
      AND public.mentor_has_emprendimiento(auth.uid(), e.id)
  )
);

-- Política para que mentores vean proyecciones de emprendimientos asignados
CREATE POLICY "Proyecciones: mentores pueden ver asignados"
ON public.proyecciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = proyecciones.emprendimiento_id
      AND public.mentor_has_emprendimiento(auth.uid(), e.id)
  )
);