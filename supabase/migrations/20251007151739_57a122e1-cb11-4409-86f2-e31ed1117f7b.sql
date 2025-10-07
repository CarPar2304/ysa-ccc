-- Política para que admins puedan insertar roles de otros usuarios
DROP POLICY IF EXISTS "Solo admins pueden insertar roles" ON public.user_roles;

CREATE POLICY "Admins pueden insertar roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
);