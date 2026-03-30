
-- Add fecha_inicio to tareas for date range support in calendar
ALTER TABLE public.tareas ADD COLUMN fecha_inicio timestamp with time zone;

-- Create eventos_calendario table
CREATE TABLE public.eventos_calendario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'clase',
  titulo text NOT NULL,
  descripcion text,
  fecha date NOT NULL,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  modalidad text,
  lugar text,
  link_virtual text,
  modulo_id uuid REFERENCES public.modulos(id) ON DELETE SET NULL,
  niveles_acceso text[],
  cohortes_acceso integer[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins: full access eventos_calendario"
  ON public.eventos_calendario FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Operadores can manage events
CREATE POLICY "Operadores: manage eventos_calendario"
  ON public.eventos_calendario FOR ALL TO authenticated
  USING (is_operador(auth.uid()))
  WITH CHECK (is_operador(auth.uid()));

-- Mentors can view
CREATE POLICY "Mentores: ver eventos_calendario"
  ON public.eventos_calendario FOR SELECT TO authenticated
  USING (is_mentor(auth.uid()));

-- Beneficiarios can view
CREATE POLICY "Beneficiarios: ver eventos_calendario"
  ON public.eventos_calendario FOR SELECT TO authenticated
  USING (is_beneficiario(auth.uid()));

-- Stakeholders can view
CREATE POLICY "Stakeholders: ver eventos_calendario"
  ON public.eventos_calendario FOR SELECT TO authenticated
  USING (is_stakeholder(auth.uid()));
