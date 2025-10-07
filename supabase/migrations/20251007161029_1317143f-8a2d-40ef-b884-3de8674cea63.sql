-- Fix critical security issue: usuarios table exposes all PII to authenticated users
-- Remove the overly permissive policy and implement proper access control

-- Drop the existing policy that allows all authenticated users to see all data
DROP POLICY IF EXISTS "Usuarios visibles para autenticados" ON public.usuarios;

-- Create a view for public profile information (safe for social features)
CREATE OR REPLACE VIEW public.usuarios_publicos AS
SELECT 
  id,
  nombres,
  apellidos,
  avatar_url,
  biografia
FROM public.usuarios;

-- Enable RLS on the view
ALTER VIEW public.usuarios_publicos SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON public.usuarios_publicos TO authenticated;

-- Create new restrictive policies for usuarios table
-- Policy 1: Users can see their own complete data
CREATE POLICY "Usuarios: ver datos propios"
ON public.usuarios
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Admins can see all user data
CREATE POLICY "Usuarios: admins ven todo"
ON public.usuarios
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy 3: Mentors can see full data of their assigned beneficiaries
CREATE POLICY "Usuarios: mentores ven beneficiarios asignados"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  public.is_mentor(auth.uid()) 
  AND EXISTS (
    SELECT 1 
    FROM public.emprendimientos e
    WHERE e.user_id = usuarios.id
      AND public.mentor_has_emprendimiento(auth.uid(), e.id)
  )
);