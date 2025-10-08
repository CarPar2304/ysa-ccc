-- Create diagnosticos table
CREATE TABLE public.diagnosticos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emprendimiento_id UUID NOT NULL REFERENCES public.emprendimientos(id) ON DELETE CASCADE,
  contenido TEXT,
  visible_para_usuario BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on diagnosticos
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnosticos
-- Beneficiarios pueden ver su propio diagnóstico si está visible
CREATE POLICY "Beneficiarios pueden ver su diagnóstico visible"
ON public.diagnosticos
FOR SELECT
USING (
  visible_para_usuario = true 
  AND EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = diagnosticos.emprendimiento_id 
    AND e.user_id = auth.uid()
  )
);

-- Mentores jurados pueden ver diagnósticos de emprendimientos asignados
CREATE POLICY "Mentores pueden ver diagnósticos asignados"
ON public.diagnosticos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprendimientos e
    WHERE e.id = diagnosticos.emprendimiento_id
    AND mentor_has_emprendimiento(auth.uid(), e.id)
  )
);

-- Admins tienen acceso completo
CREATE POLICY "Admins tienen acceso completo a diagnósticos"
ON public.diagnosticos
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add diagnostico_id to evaluaciones table
ALTER TABLE public.evaluaciones 
ADD COLUMN diagnostico_id UUID REFERENCES public.diagnosticos(id) ON DELETE SET NULL;

-- Remove diagnostico_completo from evaluaciones
ALTER TABLE public.evaluaciones 
DROP COLUMN IF EXISTS diagnostico_completo;

-- Add trigger for updated_at on diagnosticos
CREATE TRIGGER update_diagnosticos_updated_at
BEFORE UPDATE ON public.diagnosticos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();