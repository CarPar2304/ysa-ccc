
-- Clean up any leftover functions from previous attempts
DROP FUNCTION IF EXISTS public.get_operador_niveles(uuid);
DROP FUNCTION IF EXISTS public.is_operador(uuid);

-- Clean up any leftover policies on existing tables
DROP POLICY IF EXISTS "Operadores: ver diagnosticos de su nivel" ON public.diagnosticos;
DROP POLICY IF EXISTS "Operadores: ver emprendimientos de su nivel" ON public.emprendimientos;
DROP POLICY IF EXISTS "Operadores: ver usuarios de su nivel" ON public.usuarios;
DROP POLICY IF EXISTS "Operadores: ver cupos de su nivel" ON public.asignacion_cupos;
DROP POLICY IF EXISTS "Operadores: ver equipos de su nivel" ON public.equipos;
DROP POLICY IF EXISTS "Operadores: ver financiamientos de su nivel" ON public.financiamientos;
DROP POLICY IF EXISTS "Operadores: ver proyecciones de su nivel" ON public.proyecciones;
DROP POLICY IF EXISTS "Operadores: ver progreso de su nivel" ON public.progreso_usuario;
DROP POLICY IF EXISTS "Operadores: ver modulos de su nivel" ON public.modulos;
DROP POLICY IF EXISTS "Operadores: ver clases de su nivel" ON public.clases;
DROP POLICY IF EXISTS "Operadores: ver autorizaciones de su nivel" ON public.autorizaciones;

-- Drop table if exists (safe since no policies reference it now)
DROP TABLE IF EXISTS public.mentor_operadores;

-- Create table
CREATE TABLE public.mentor_operadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nivel TEXT NOT NULL CHECK (nivel IN ('Starter', 'Growth', 'Scale')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, nivel)
);

ALTER TABLE public.mentor_operadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins: full access mentor_operadores"
ON public.mentor_operadores FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Mentores: ver propias asignaciones operador"
ON public.mentor_operadores FOR SELECT TO authenticated
USING (mentor_id = auth.uid());

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_operador(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.mentor_operadores WHERE mentor_id = _user_id AND activo = true); $$;

CREATE OR REPLACE FUNCTION public.get_operador_niveles(_user_id uuid)
RETURNS TEXT[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(array_agg(nivel), '{}') FROM public.mentor_operadores WHERE mentor_id = _user_id AND activo = true; $$;

-- RLS policies for operator access
CREATE POLICY "Operadores: ver emprendimientos de su nivel"
ON public.emprendimientos FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.asignacion_cupos ac
  WHERE ac.emprendimiento_id = emprendimientos.id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver diagnosticos de su nivel"
ON public.diagnosticos FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.asignacion_cupos ac
  WHERE ac.emprendimiento_id = diagnosticos.emprendimiento_id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver usuarios de su nivel"
ON public.usuarios FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.emprendimientos e
  JOIN public.asignacion_cupos ac ON ac.emprendimiento_id = e.id
  WHERE e.user_id = usuarios.id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver cupos de su nivel"
ON public.asignacion_cupos FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND estado = 'aprobado'
  AND nivel::text = ANY(get_operador_niveles(auth.uid())));

CREATE POLICY "Operadores: ver equipos de su nivel"
ON public.equipos FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.asignacion_cupos ac
  WHERE ac.emprendimiento_id = equipos.emprendimiento_id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver financiamientos de su nivel"
ON public.financiamientos FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.asignacion_cupos ac
  WHERE ac.emprendimiento_id = financiamientos.emprendimiento_id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver proyecciones de su nivel"
ON public.proyecciones FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.asignacion_cupos ac
  WHERE ac.emprendimiento_id = proyecciones.emprendimiento_id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver progreso de su nivel"
ON public.progreso_usuario FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.emprendimientos e
  JOIN public.asignacion_cupos ac ON ac.emprendimiento_id = e.id
  WHERE e.user_id = progreso_usuario.user_id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver modulos de su nivel"
ON public.modulos FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND nivel::text = ANY(get_operador_niveles(auth.uid())));

CREATE POLICY "Operadores: ver clases de su nivel"
ON public.clases FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.modulos m
  WHERE m.id = clases.modulo_id AND m.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

CREATE POLICY "Operadores: ver autorizaciones de su nivel"
ON public.autorizaciones FOR SELECT TO authenticated
USING (is_operador(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.emprendimientos e
  JOIN public.asignacion_cupos ac ON ac.emprendimiento_id = e.id
  WHERE e.user_id = autorizaciones.user_id AND ac.estado = 'aprobado'
    AND ac.nivel::text = ANY(get_operador_niveles(auth.uid()))
));

-- Trigger
CREATE TRIGGER update_mentor_operadores_updated_at
BEFORE UPDATE ON public.mentor_operadores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
