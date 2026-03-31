
-- Allow co-founders to see entregas from their team members
CREATE POLICY "Cofounders can view team submissions"
ON public.entregas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.emprendimiento_miembros em1
    JOIN public.emprendimiento_miembros em2 ON em1.emprendimiento_id = em2.emprendimiento_id
    WHERE em1.user_id = auth.uid()
      AND em2.user_id = entregas.user_id
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.emprendimiento_miembros em
    JOIN public.emprendimientos e ON e.id = em.emprendimiento_id
    WHERE em.user_id = auth.uid()
      AND e.user_id = entregas.user_id
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.emprendimientos e
    JOIN public.emprendimiento_miembros em ON em.emprendimiento_id = e.id
    WHERE e.user_id = auth.uid()
      AND em.user_id = entregas.user_id
  )
);
