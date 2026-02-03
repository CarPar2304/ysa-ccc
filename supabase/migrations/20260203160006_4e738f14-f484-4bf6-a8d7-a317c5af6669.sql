-- Create tareas table for module assignments
CREATE TABLE public.tareas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  num_documentos INTEGER NOT NULL DEFAULT 1 CHECK (num_documentos >= 1 AND num_documentos <= 10),
  fecha_limite TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true
);

-- Create entregas table for user submissions
CREATE TABLE public.entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  comentario TEXT,
  archivos_urls JSONB DEFAULT '[]'::jsonb,
  fecha_entrega TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'entregado' CHECK (estado IN ('entregado', 'revisado', 'aprobado', 'rechazado')),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tarea_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tareas

-- Everyone can view active tasks
CREATE POLICY "Anyone can view active tasks"
ON public.tareas
FOR SELECT
USING (activo = true OR public.is_admin(auth.uid()) OR public.can_edit_modulo(auth.uid(), modulo_id));

-- Admins and module editors can insert tasks
CREATE POLICY "Admins and module editors can create tasks"
ON public.tareas
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR public.can_edit_modulo(auth.uid(), modulo_id)
);

-- Admins and module editors can update tasks
CREATE POLICY "Admins and module editors can update tasks"
ON public.tareas
FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR public.can_edit_modulo(auth.uid(), modulo_id)
);

-- Admins and module editors can delete tasks
CREATE POLICY "Admins and module editors can delete tasks"
ON public.tareas
FOR DELETE
USING (
  public.is_admin(auth.uid()) OR public.can_edit_modulo(auth.uid(), modulo_id)
);

-- RLS Policies for entregas

-- Users can view their own submissions, admins/editors can view all for their modules
CREATE POLICY "Users can view own submissions or admin can view all"
ON public.entregas
FOR SELECT
USING (
  user_id = auth.uid() 
  OR public.is_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM public.tareas t 
    WHERE t.id = tarea_id AND public.can_edit_modulo(auth.uid(), t.modulo_id)
  )
);

-- Beneficiarios can create submissions for their own tasks
CREATE POLICY "Beneficiarios can submit own tasks"
ON public.entregas
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND public.is_beneficiario(auth.uid())
);

-- Users can update their own submissions (before deadline), admins/editors can update for feedback
CREATE POLICY "Users can update own submissions or editors can add feedback"
ON public.entregas
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR public.is_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM public.tareas t 
    WHERE t.id = tarea_id AND public.can_edit_modulo(auth.uid(), t.modulo_id)
  )
);

-- Users can delete their own submissions
CREATE POLICY "Users can delete own submissions"
ON public.entregas
FOR DELETE
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER set_tareas_updated_at
  BEFORE UPDATE ON public.tareas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create storage bucket for task submissions
INSERT INTO storage.buckets (id, name, public) 
VALUES ('entregas', 'entregas', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for entregas bucket
CREATE POLICY "Users can upload their own submissions"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'entregas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own submissions or editors can view all"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'entregas' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
    OR public.is_mentor(auth.uid())
  )
);

CREATE POLICY "Users can update their own submission files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'entregas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own submission files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'entregas' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);