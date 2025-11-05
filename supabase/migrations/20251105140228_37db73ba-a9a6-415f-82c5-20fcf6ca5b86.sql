-- Recrear función is_beneficiario como security definer
CREATE OR REPLACE FUNCTION public.is_beneficiario(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'beneficiario'::app_role
  )
$$;

-- Actualizar política de inserción para reservas_asesoria
DROP POLICY IF EXISTS "Reservas: beneficiarios crean propias" ON public.reservas_asesoria;

CREATE POLICY "Reservas: beneficiarios crean propias"
ON public.reservas_asesoria
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_beneficiario(auth.uid()) 
  AND beneficiario_id = auth.uid()
);