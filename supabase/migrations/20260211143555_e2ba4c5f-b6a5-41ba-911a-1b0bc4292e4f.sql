-- Drop the restrictive update policy
DROP POLICY "Mentores: actualizar propias evaluaciones" ON public.evaluaciones;

-- Recreate without the puede_editar restriction so mentors can edit even after submitting
CREATE POLICY "Mentores: actualizar propias evaluaciones"
ON public.evaluaciones
FOR UPDATE
TO authenticated
USING (
  is_mentor(auth.uid())
  AND mentor_id = auth.uid()
  AND tipo_evaluacion = 'jurado'
)
WITH CHECK (
  is_mentor(auth.uid())
  AND mentor_id = auth.uid()
  AND tipo_evaluacion = 'jurado'
);