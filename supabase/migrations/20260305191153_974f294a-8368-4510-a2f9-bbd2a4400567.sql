-- Allow all authenticated users (not just beneficiarios) to create comments
DROP POLICY IF EXISTS "Comentarios: crear solo beneficiario" ON public.comentarios;
CREATE POLICY "Comentarios: crear autenticados" ON public.comentarios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());