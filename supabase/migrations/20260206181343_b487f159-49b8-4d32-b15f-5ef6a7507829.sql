-- Permitir que stakeholders vean data necesaria para el Admin Dashboard (solo lectura)

-- user_roles: permitir leer SOLO filas de beneficiarios (para filtros del dashboard)
DROP POLICY IF EXISTS "Stakeholders pueden ver beneficiarios" ON public.user_roles;
CREATE POLICY "Stakeholders pueden ver beneficiarios"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  is_stakeholder(auth.uid())
  AND role = 'beneficiario'::public.app_role
);

-- emprendimientos: permitir lectura para analytics del dashboard
DROP POLICY IF EXISTS "Emprendimientos: stakeholders pueden ver todo" ON public.emprendimientos;
CREATE POLICY "Emprendimientos: stakeholders pueden ver todo"
ON public.emprendimientos
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));

-- asignacion_cupos: permitir lectura SOLO de aprobados (dashboard usa estado=aprobado)
DROP POLICY IF EXISTS "Asignacion cupos: stakeholders ven aprobados" ON public.asignacion_cupos;
CREATE POLICY "Asignacion cupos: stakeholders ven aprobados"
ON public.asignacion_cupos
FOR SELECT
TO authenticated
USING (
  is_stakeholder(auth.uid())
  AND estado = 'aprobado'
);

-- evaluaciones: permitir lectura SOLO de tipo 'ccc' (para cálculo de nivel teórico)
DROP POLICY IF EXISTS "Evaluaciones: stakeholders ven ccc" ON public.evaluaciones;
CREATE POLICY "Evaluaciones: stakeholders ven ccc"
ON public.evaluaciones
FOR SELECT
TO authenticated
USING (
  is_stakeholder(auth.uid())
  AND tipo_evaluacion = 'ccc'::public.tipo_evaluacion
);

-- equipos
DROP POLICY IF EXISTS "Equipos: stakeholders pueden ver" ON public.equipos;
CREATE POLICY "Equipos: stakeholders pueden ver"
ON public.equipos
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));

-- financiamientos
DROP POLICY IF EXISTS "Financiamientos: stakeholders pueden ver" ON public.financiamientos;
CREATE POLICY "Financiamientos: stakeholders pueden ver"
ON public.financiamientos
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));

-- proyecciones
DROP POLICY IF EXISTS "Proyecciones: stakeholders pueden ver" ON public.proyecciones;
CREATE POLICY "Proyecciones: stakeholders pueden ver"
ON public.proyecciones
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));
