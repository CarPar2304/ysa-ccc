-- Crear tabla para asignaciones de mentores a emprendimientos
CREATE TABLE public.mentor_emprendimiento_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  emprendimiento_id uuid NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  fecha_asignacion timestamp with time zone NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, emprendimiento_id)
);

-- Enable RLS
ALTER TABLE public.mentor_emprendimiento_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins pueden ver todas las asignaciones"
ON public.mentor_emprendimiento_assignments
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Mentores pueden ver sus propias asignaciones"
ON public.mentor_emprendimiento_assignments
FOR SELECT
USING (mentor_id = auth.uid());

CREATE POLICY "Beneficiarios pueden ver su mentor asignado"
ON public.mentor_emprendimiento_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = emprendimiento_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Solo admins pueden insertar asignaciones"
ON public.mentor_emprendimiento_assignments
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Solo admins pueden actualizar asignaciones"
ON public.mentor_emprendimiento_assignments
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Solo admins pueden eliminar asignaciones"
ON public.mentor_emprendimiento_assignments
FOR DELETE
USING (is_admin(auth.uid()));

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_mentor_assignments_mentor ON public.mentor_emprendimiento_assignments(mentor_id);
CREATE INDEX idx_mentor_assignments_emprendimiento ON public.mentor_emprendimiento_assignments(emprendimiento_id);
CREATE INDEX idx_mentor_assignments_activo ON public.mentor_emprendimiento_assignments(activo);