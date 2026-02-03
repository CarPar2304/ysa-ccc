-- Security improvements: Restrict user_roles visibility to own records only
DROP POLICY IF EXISTS "Leer roles (todos autenticados)" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure admins can still view all roles for management
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Add audit logging for autorizaciones changes
CREATE TABLE IF NOT EXISTS public.autorizaciones_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  autorizacion_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.autorizaciones_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.autorizaciones_audit_log 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION public.log_autorizaciones_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.autorizaciones_audit_log (autorizacion_id, user_id, action, old_values, new_values)
    VALUES (OLD.id, OLD.user_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.autorizaciones_audit_log (autorizacion_id, user_id, action, new_values)
    VALUES (NEW.id, NEW.user_id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.autorizaciones_audit_log (autorizacion_id, user_id, action, old_values)
    VALUES (OLD.id, OLD.user_id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for autorizaciones
DROP TRIGGER IF EXISTS autorizaciones_audit_trigger ON public.autorizaciones;
CREATE TRIGGER autorizaciones_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.autorizaciones
FOR EACH ROW EXECUTE FUNCTION public.log_autorizaciones_changes();

-- Restrict entregas visibility more tightly
DROP POLICY IF EXISTS "Beneficiarios can view own submissions" ON public.entregas;
DROP POLICY IF EXISTS "Module editors can view submissions" ON public.entregas;
DROP POLICY IF EXISTS "Mentores asignados pueden ver entregas" ON public.entregas;

-- Only the submitter can view their own submissions
CREATE POLICY "Users can view own submissions" 
ON public.entregas 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all submissions for administrative purposes
CREATE POLICY "Admins can view all submissions" 
ON public.entregas 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Mentors with module edit access can view submissions for that module
CREATE POLICY "Module mentors can view submissions" 
ON public.entregas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tareas t
    JOIN public.asignaciones_mentor am ON am.modulo_id = t.modulo_id
    WHERE t.id = entregas.tarea_id
    AND am.mentor_id = auth.uid()
    AND am.puede_editar = true
  )
);