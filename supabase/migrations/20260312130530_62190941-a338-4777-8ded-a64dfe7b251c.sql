CREATE POLICY "Operadores: ver acudientes de su nivel"
ON public.acudientes
FOR SELECT
TO authenticated
USING (
  is_operador(auth.uid()) AND menor_id IN (
    SELECT e.user_id FROM emprendimientos e
    WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
  )
);