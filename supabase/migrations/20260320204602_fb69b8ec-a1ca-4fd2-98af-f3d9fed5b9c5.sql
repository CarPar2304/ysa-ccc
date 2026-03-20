
-- Create a security definer function to check co-founder membership
CREATE OR REPLACE FUNCTION public.is_emprendimiento_member(_user_id uuid, _emprendimiento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM emprendimiento_miembros
    WHERE user_id = _user_id AND emprendimiento_id = _emprendimiento_id
  );
$$;

-- Create a security definer function to check emprendimiento ownership
CREATE OR REPLACE FUNCTION public.is_emprendimiento_owner(_user_id uuid, _emprendimiento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM emprendimientos
    WHERE id = _emprendimiento_id AND user_id = _user_id
  );
$$;

-- Fix emprendimientos: replace cofounders policy
DROP POLICY IF EXISTS "Cofounders can view emprendimiento" ON emprendimientos;
CREATE POLICY "Cofounders can view emprendimiento" ON emprendimientos
  FOR SELECT TO authenticated
  USING (is_emprendimiento_member(auth.uid(), id));

-- Fix emprendimiento_miembros: replace owner policy that causes recursion
DROP POLICY IF EXISTS "Owner can manage members" ON emprendimiento_miembros;
CREATE POLICY "Owner can manage members" ON emprendimiento_miembros
  FOR ALL TO authenticated
  USING (is_emprendimiento_owner(auth.uid(), emprendimiento_id))
  WITH CHECK (is_emprendimiento_owner(auth.uid(), emprendimiento_id));

-- Fix other tables that reference emprendimiento_miembros -> emprendimientos chain
-- asignacion_cupos cofounders policy
DROP POLICY IF EXISTS "Cofounders: ver cupos" ON asignacion_cupos;
CREATE POLICY "Cofounders: ver cupos" ON asignacion_cupos
  FOR SELECT TO authenticated
  USING (is_emprendimiento_member(auth.uid(), emprendimiento_id));

-- diagnosticos cofounders policy  
DROP POLICY IF EXISTS "Cofounders: ver diagnosticos" ON diagnosticos;
CREATE POLICY "Cofounders: ver diagnosticos" ON diagnosticos
  FOR SELECT TO authenticated
  USING (is_emprendimiento_member(auth.uid(), emprendimiento_id) AND visible_para_usuario = true);

-- evaluaciones cofounders policy
DROP POLICY IF EXISTS "Cofounders: ver evaluaciones" ON evaluaciones;
CREATE POLICY "Cofounders: ver evaluaciones" ON evaluaciones
  FOR SELECT TO authenticated
  USING (is_emprendimiento_member(auth.uid(), emprendimiento_id) AND visible_para_usuario = true);

-- equipos cofounders policy
DROP POLICY IF EXISTS "Cofounders: ver equipos" ON equipos;
CREATE POLICY "Cofounders: ver equipos" ON equipos
  FOR SELECT TO authenticated
  USING (is_emprendimiento_member(auth.uid(), emprendimiento_id));

-- financiamientos cofounders policy
DROP POLICY IF EXISTS "Cofounders: ver financiamientos" ON financiamientos;
CREATE POLICY "Cofounders: ver financiamientos" ON financiamientos
  FOR SELECT TO authenticated
  USING (is_emprendimiento_member(auth.uid(), emprendimiento_id));
