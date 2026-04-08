
-- 1. Create stakeholder_filtros table
CREATE TABLE public.stakeholder_filtros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campo text NOT NULL,
  valor text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, campo, valor)
);

ALTER TABLE public.stakeholder_filtros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access stakeholder_filtros"
  ON public.stakeholder_filtros FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Stakeholders can view own filters"
  ON public.stakeholder_filtros FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_stakeholder(auth.uid()));

-- 2. Create function to get filtered emprendimiento IDs for a stakeholder
CREATE OR REPLACE FUNCTION public.get_stakeholder_filtered_emprendimiento_ids(_stakeholder_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_filters boolean;
  result uuid[];
  campo_rec record;
  campo_ids uuid[];
  first_campo boolean := true;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM stakeholder_filtros
    WHERE user_id = _stakeholder_id AND activo = true
  ) INTO has_filters;

  IF NOT has_filters THEN
    RETURN NULL;
  END IF;

  FOR campo_rec IN
    SELECT DISTINCT campo FROM stakeholder_filtros
    WHERE user_id = _stakeholder_id AND activo = true
  LOOP
    IF campo_rec.campo = 'municipio' THEN
      SELECT array_agg(DISTINCT e.id) INTO campo_ids
      FROM emprendimientos e
      JOIN usuarios u ON u.id = e.user_id
      WHERE u.municipio IN (
        SELECT valor FROM stakeholder_filtros
        WHERE user_id = _stakeholder_id AND activo = true AND campo = 'municipio'
      );
    ELSIF campo_rec.campo = 'departamento' THEN
      SELECT array_agg(DISTINCT e.id) INTO campo_ids
      FROM emprendimientos e
      JOIN usuarios u ON u.id = e.user_id
      WHERE u.departamento IN (
        SELECT valor FROM stakeholder_filtros
        WHERE user_id = _stakeholder_id AND activo = true AND campo = 'departamento'
      );
    ELSIF campo_rec.campo = 'ubicacion_principal' THEN
      SELECT array_agg(DISTINCT e.id) INTO campo_ids
      FROM emprendimientos e
      WHERE (e.ubicacion_principal)::text IN (
        SELECT valor FROM stakeholder_filtros
        WHERE user_id = _stakeholder_id AND activo = true AND campo = 'ubicacion_principal'
      );
    ELSIF campo_rec.campo = 'nivel_definitivo' THEN
      SELECT array_agg(DISTINCT e.id) INTO campo_ids
      FROM emprendimientos e
      WHERE (e.nivel_definitivo)::text IN (
        SELECT valor FROM stakeholder_filtros
        WHERE user_id = _stakeholder_id AND activo = true AND campo = 'nivel_definitivo'
      );
    ELSE
      CONTINUE;
    END IF;

    IF first_campo THEN
      result := COALESCE(campo_ids, '{}');
      first_campo := false;
    ELSE
      SELECT array_agg(x) INTO result
      FROM unnest(result) x
      WHERE x = ANY(COALESCE(campo_ids, '{}'));
    END IF;
  END LOOP;

  RETURN COALESCE(result, '{}');
END;
$$;

-- 3. Helper to check stakeholder access for an emprendimiento
CREATE OR REPLACE FUNCTION public.stakeholder_can_see_emprendimiento(_stakeholder_id uuid, _emprendimiento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN get_stakeholder_filtered_emprendimiento_ids(_stakeholder_id) IS NULL THEN true
      ELSE _emprendimiento_id = ANY(get_stakeholder_filtered_emprendimiento_ids(_stakeholder_id))
    END;
$$;

-- 4. Update all stakeholder RLS policies

-- emprendimientos
DROP POLICY "Emprendimientos: stakeholders pueden ver todo" ON public.emprendimientos;
CREATE POLICY "Emprendimientos: stakeholders pueden ver todo"
  ON public.emprendimientos FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND stakeholder_can_see_emprendimiento(auth.uid(), id)
  );

-- equipos
DROP POLICY "Equipos: stakeholders pueden ver" ON public.equipos;
CREATE POLICY "Equipos: stakeholders pueden ver"
  ON public.equipos FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- financiamientos
DROP POLICY "Financiamientos: stakeholders pueden ver" ON public.financiamientos;
CREATE POLICY "Financiamientos: stakeholders pueden ver"
  ON public.financiamientos FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- diagnosticos
DROP POLICY "Diagnosticos: stakeholders pueden ver" ON public.diagnosticos;
CREATE POLICY "Diagnosticos: stakeholders pueden ver"
  ON public.diagnosticos FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- evaluaciones
DROP POLICY "Evaluaciones: stakeholders ven ccc" ON public.evaluaciones;
CREATE POLICY "Evaluaciones: stakeholders ven ccc"
  ON public.evaluaciones FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND tipo_evaluacion = 'ccc'::tipo_evaluacion
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- emprendimiento_miembros
DROP POLICY "Stakeholders see all members" ON public.emprendimiento_miembros;
CREATE POLICY "Stakeholders see all members"
  ON public.emprendimiento_miembros FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- asignacion_cupos
DROP POLICY "Asignacion cupos: stakeholders ven aprobados" ON public.asignacion_cupos;
CREATE POLICY "Asignacion cupos: stakeholders ven aprobados"
  ON public.asignacion_cupos FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND estado = 'aprobado'::text
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- proyecciones
DROP POLICY "Proyecciones: stakeholders pueden ver" ON public.proyecciones;
CREATE POLICY "Proyecciones: stakeholders pueden ver"
  ON public.proyecciones FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND stakeholder_can_see_emprendimiento(auth.uid(), emprendimiento_id)
  );

-- usuarios
DROP POLICY "Usuarios: stakeholders ven todo" ON public.usuarios;
CREATE POLICY "Usuarios: stakeholders ven todo"
  ON public.usuarios FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND (
      get_stakeholder_filtered_emprendimiento_ids(auth.uid()) IS NULL
      OR id IN (
        SELECT e.user_id FROM emprendimientos e
        WHERE e.id = ANY(get_stakeholder_filtered_emprendimiento_ids(auth.uid()))
      )
    )
  );

-- user_roles
DROP POLICY "Stakeholders pueden ver beneficiarios" ON public.user_roles;
CREATE POLICY "Stakeholders pueden ver beneficiarios"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    is_stakeholder(auth.uid())
    AND role = 'beneficiario'::app_role
    AND (
      get_stakeholder_filtered_emprendimiento_ids(auth.uid()) IS NULL
      OR user_id IN (
        SELECT e.user_id FROM emprendimientos e
        WHERE e.id = ANY(get_stakeholder_filtered_emprendimiento_ids(auth.uid()))
      )
    )
  );
