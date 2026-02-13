-- Allow operators to read beneficiario roles (needed for dashboard stats)
CREATE POLICY "Operadores pueden ver roles beneficiarios"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  is_operador(auth.uid()) AND role = 'beneficiario'::app_role
);

-- Allow operators to see evaluaciones for their level's emprendimientos
CREATE POLICY "Operadores: ver evaluaciones de su nivel"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  is_operador(auth.uid()) 
  AND emprendimiento_id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
);