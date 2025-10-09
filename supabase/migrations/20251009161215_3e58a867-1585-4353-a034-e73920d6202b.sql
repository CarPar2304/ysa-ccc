-- Fix security issue: Add explicit authentication checks to usuarios table RLS policies
-- This prevents unauthenticated access attempts to sensitive user PII

-- Drop existing policies
DROP POLICY IF EXISTS "Usuarios: ver datos propios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios: admins ven todo" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios: mentores ven beneficiarios asignados" ON public.usuarios;
DROP POLICY IF EXISTS "Usuario puede actualizar su perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Usuario puede crear su perfil" ON public.usuarios;

-- Recreate policies with explicit authentication checks
-- Only authenticated users can read their own data
CREATE POLICY "Usuarios: ver datos propios"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Only admins can see all users
CREATE POLICY "Usuarios: admins ven todo"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Mentors can only see assigned beneficiaries
CREATE POLICY "Usuarios: mentores ven beneficiarios asignados"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    is_mentor(auth.uid()) 
    AND EXISTS (
      SELECT 1
      FROM emprendimientos e
      WHERE e.user_id = usuarios.id 
        AND mentor_has_emprendimiento(auth.uid(), e.id)
    )
  );

-- Users can only update their own profile
CREATE POLICY "Usuario puede actualizar su perfil"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can only create their own profile
CREATE POLICY "Usuario puede crear su perfil"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);