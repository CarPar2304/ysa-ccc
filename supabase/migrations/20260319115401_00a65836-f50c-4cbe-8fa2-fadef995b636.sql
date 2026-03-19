-- Allow authenticated users to read user_roles (only role and user_id, controlled by column selection in app)
CREATE POLICY "Usuarios autenticados: ver roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read mentor_operadores for badge display
CREATE POLICY "Usuarios autenticados: ver operadores"
ON public.mentor_operadores
FOR SELECT
TO authenticated
USING (true);