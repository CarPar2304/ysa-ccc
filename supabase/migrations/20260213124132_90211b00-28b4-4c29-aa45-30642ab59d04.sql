
-- Create a SECURITY DEFINER function to get emprendimiento IDs for an operator
-- This bypasses RLS and breaks the circular dependency
CREATE OR REPLACE FUNCTION public.get_operador_emprendimiento_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ac.emprendimiento_id
  FROM asignacion_cupos ac
  JOIN mentor_operadores mo ON mo.mentor_id = _user_id AND mo.activo = true
  WHERE ac.estado = 'aprobado'
    AND ac.nivel::text = mo.nivel;
$$;

-- Also ensure is_operador and get_operador_niveles are SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_operador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mentor_operadores
    WHERE mentor_id = _user_id AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_operador_niveles(_user_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(array_agg(nivel), '{}')
  FROM mentor_operadores
  WHERE mentor_id = _user_id AND activo = true;
$$;

-- Fix emprendimientos: replace operador policy to use the new function
DROP POLICY IF EXISTS "Operadores: ver emprendimientos de su nivel" ON public.emprendimientos;
CREATE POLICY "Operadores: ver emprendimientos de su nivel"
  ON public.emprendimientos FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND id IN (SELECT get_operador_emprendimiento_ids(auth.uid())));

-- Fix asignacion_cupos: replace operador policy to avoid recursion
DROP POLICY IF EXISTS "Operadores: ver cupos de su nivel" ON public.asignacion_cupos;
CREATE POLICY "Operadores: ver cupos de su nivel"
  ON public.asignacion_cupos FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND (estado = 'aprobado') AND (nivel::text = ANY(get_operador_niveles(auth.uid()))));

-- Fix diagnosticos
DROP POLICY IF EXISTS "Operadores: ver diagnosticos de su nivel" ON public.diagnosticos;
CREATE POLICY "Operadores: ver diagnosticos de su nivel"
  ON public.diagnosticos FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND emprendimiento_id IN (SELECT get_operador_emprendimiento_ids(auth.uid())));

-- Fix equipos
DROP POLICY IF EXISTS "Operadores: ver equipos de su nivel" ON public.equipos;
CREATE POLICY "Operadores: ver equipos de su nivel"
  ON public.equipos FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND emprendimiento_id IN (SELECT get_operador_emprendimiento_ids(auth.uid())));

-- Fix financiamientos
DROP POLICY IF EXISTS "Operadores: ver financiamientos de su nivel" ON public.financiamientos;
CREATE POLICY "Operadores: ver financiamientos de su nivel"
  ON public.financiamientos FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND emprendimiento_id IN (SELECT get_operador_emprendimiento_ids(auth.uid())));

-- Fix proyecciones
DROP POLICY IF EXISTS "Operadores: ver proyecciones de su nivel" ON public.proyecciones;
CREATE POLICY "Operadores: ver proyecciones de su nivel"
  ON public.proyecciones FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND emprendimiento_id IN (SELECT get_operador_emprendimiento_ids(auth.uid())));

-- Fix autorizaciones
DROP POLICY IF EXISTS "Operadores: ver autorizaciones de su nivel" ON public.autorizaciones;
CREATE POLICY "Operadores: ver autorizaciones de su nivel"
  ON public.autorizaciones FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND user_id IN (
    SELECT e.user_id FROM emprendimientos e
    WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
  ));

-- Fix progreso_usuario
DROP POLICY IF EXISTS "Operadores: ver progreso de su nivel" ON public.progreso_usuario;
CREATE POLICY "Operadores: ver progreso de su nivel"
  ON public.progreso_usuario FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND user_id IN (
    SELECT e.user_id FROM emprendimientos e
    WHERE e.id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
  ));

-- Fix clases
DROP POLICY IF EXISTS "Operadores: ver clases de su nivel" ON public.clases;
CREATE POLICY "Operadores: ver clases de su nivel"
  ON public.clases FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND EXISTS (
    SELECT 1 FROM modulos m
    WHERE m.id = clases.modulo_id AND m.nivel::text = ANY(get_operador_niveles(auth.uid()))
  ));

-- Fix modulos
DROP POLICY IF EXISTS "Operadores: ver modulos de su nivel" ON public.modulos;
CREATE POLICY "Operadores: ver modulos de su nivel"
  ON public.modulos FOR SELECT
  TO authenticated
  USING (is_operador(auth.uid()) AND nivel::text = ANY(get_operador_niveles(auth.uid())));
