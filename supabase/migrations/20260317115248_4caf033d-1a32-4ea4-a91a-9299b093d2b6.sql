-- Beneficiarios need to see other users' names/avatars/levels in YSA Conecta feed
CREATE POLICY "Usuarios: beneficiarios ven todos"
ON public.usuarios
FOR SELECT
TO authenticated
USING (is_beneficiario(auth.uid()));
