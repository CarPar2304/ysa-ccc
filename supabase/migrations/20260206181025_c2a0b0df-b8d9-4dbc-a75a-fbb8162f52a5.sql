-- Política para que stakeholders puedan ver todos los usuarios (necesario para YSA Conecta)
CREATE POLICY "Usuarios: stakeholders ven todo"
ON public.usuarios
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));