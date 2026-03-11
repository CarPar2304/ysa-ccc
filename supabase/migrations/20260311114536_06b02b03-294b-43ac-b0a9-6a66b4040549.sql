DROP POLICY "Posts: crear solo beneficiario" ON public.posts;

CREATE POLICY "Posts: crear autenticados con cupo o rol especial"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    is_beneficiario(auth.uid())
    OR is_admin(auth.uid())
    OR is_stakeholder(auth.uid())
    OR is_operador(auth.uid())
  )
);