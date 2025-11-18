-- Crear tabla asignaciones_mentor para gestionar permisos de edición de módulos
CREATE TABLE IF NOT EXISTS public.asignaciones_mentor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  puede_editar BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, modulo_id)
);

-- Habilitar RLS
ALTER TABLE public.asignaciones_mentor ENABLE ROW LEVEL SECURITY;

-- Política: Admins pueden gestionar todas las asignaciones
CREATE POLICY "Admins pueden gestionar asignaciones_mentor"
ON public.asignaciones_mentor
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Política: Mentores pueden ver sus propias asignaciones
CREATE POLICY "Mentores pueden ver sus asignaciones"
ON public.asignaciones_mentor
FOR SELECT
TO authenticated
USING (mentor_id = auth.uid() OR is_admin(auth.uid()));

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_mentor_mentor_id ON public.asignaciones_mentor(mentor_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_mentor_modulo_id ON public.asignaciones_mentor(modulo_id);