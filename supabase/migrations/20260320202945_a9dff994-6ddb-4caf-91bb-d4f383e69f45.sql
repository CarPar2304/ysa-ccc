
-- Table to track co-founders linked to emprendimientos
CREATE TABLE public.emprendimiento_miembros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id uuid NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'cofundador',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(emprendimiento_id, user_id)
);

ALTER TABLE public.emprendimiento_miembros ENABLE ROW LEVEL SECURITY;

-- Owner of the emprendimiento can manage members
CREATE POLICY "Owner can manage members"
ON public.emprendimiento_miembros
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimientos e
    WHERE e.id = emprendimiento_miembros.emprendimiento_id
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM emprendimientos e
    WHERE e.id = emprendimiento_miembros.emprendimiento_id
    AND e.user_id = auth.uid()
  )
);

-- Members can see their own membership
CREATE POLICY "Members can see own membership"
ON public.emprendimiento_miembros
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins full access to members"
ON public.emprendimiento_miembros
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Operadores can see members of their level
CREATE POLICY "Operadores see members of their level"
ON public.emprendimiento_miembros
FOR SELECT
TO authenticated
USING (
  is_operador(auth.uid()) AND 
  emprendimiento_id IN (SELECT get_operador_emprendimiento_ids(auth.uid()))
);

-- Mentors can see members of assigned emprendimientos
CREATE POLICY "Mentors see assigned members"
ON public.emprendimiento_miembros
FOR SELECT
TO authenticated
USING (mentor_has_emprendimiento(auth.uid(), emprendimiento_id));

-- Stakeholders can see all members
CREATE POLICY "Stakeholders see all members"
ON public.emprendimiento_miembros
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));

-- Now update emprendimientos RLS so co-founders can see their emprendimiento
CREATE POLICY "Cofounders can view emprendimiento"
ON public.emprendimientos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = emprendimientos.id
    AND em.user_id = auth.uid()
  )
);

-- Co-founders can view related data: equipos
CREATE POLICY "Cofounders: ver equipos"
ON public.equipos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = equipos.emprendimiento_id
    AND em.user_id = auth.uid()
  )
);

-- Co-founders can view financiamientos
CREATE POLICY "Cofounders: ver financiamientos"
ON public.financiamientos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = financiamientos.emprendimiento_id
    AND em.user_id = auth.uid()
  )
);

-- Co-founders can view proyecciones
CREATE POLICY "Cofounders: ver proyecciones"
ON public.proyecciones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = proyecciones.emprendimiento_id
    AND em.user_id = auth.uid()
  )
);

-- Co-founders can view diagnosticos
CREATE POLICY "Cofounders: ver diagnosticos"
ON public.diagnosticos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = diagnosticos.emprendimiento_id
    AND em.user_id = auth.uid()
  )
  AND visible_para_usuario = true
);

-- Co-founders can view evaluaciones
CREATE POLICY "Cofounders: ver evaluaciones"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  visible_para_usuario = true AND
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = evaluaciones.emprendimiento_id
    AND em.user_id = auth.uid()
  )
);

-- Co-founders can view asignacion_cupos
CREATE POLICY "Cofounders: ver cupos"
ON public.asignacion_cupos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emprendimiento_miembros em
    WHERE em.emprendimiento_id = asignacion_cupos.emprendimiento_id
    AND em.user_id = auth.uid()
  )
);
