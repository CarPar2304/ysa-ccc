CREATE POLICY "Operadores: gestionar progreso de su nivel"
ON public.progreso_usuario
FOR ALL
TO authenticated
USING (
  is_operador(auth.uid()) AND user_id IN (
    SELECT e.user_id FROM emprendimientos e
    WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
  )
)
WITH CHECK (
  is_operador(auth.uid()) AND user_id IN (
    SELECT e.user_id FROM emprendimientos e
    WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
  )
);