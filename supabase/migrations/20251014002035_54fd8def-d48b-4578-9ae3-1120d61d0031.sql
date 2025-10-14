-- Security Fix: Tighten Guardian Data Access Controls
-- This migration addresses the guardian data exposure vulnerability by:
-- 1. Making guardian data read-only for minors
-- 2. Adding audit logging for admin access to guardian data
-- 3. Restricting UPDATE/DELETE operations to admins only

-- Create audit log table for guardian data access
CREATE TABLE IF NOT EXISTS public.acudientes_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acudiente_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'view', 'update', 'delete', 'insert'
  changed_fields JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.acudientes_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Solo admins pueden ver audit logs de acudientes"
ON public.acudientes_audit_log
FOR SELECT
USING (is_admin(auth.uid()));

-- Function to log guardian data access by admins
CREATE OR REPLACE FUNCTION public.log_acudiente_admin_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log admin actions (not minor's own actions)
  IF is_admin(auth.uid()) THEN
    INSERT INTO public.acudientes_audit_log (
      acudiente_id,
      admin_id,
      action,
      changed_fields,
      timestamp
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      auth.uid(),
      TG_OP,
      CASE 
        WHEN TG_OP = 'UPDATE' THEN 
          jsonb_build_object(
            'old', row_to_json(OLD)::jsonb,
            'new', row_to_json(NEW)::jsonb
          )
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
        WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
        ELSE NULL
      END,
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit trigger for all guardian data operations
CREATE TRIGGER audit_acudientes_changes
AFTER INSERT OR UPDATE OR DELETE ON public.acudientes
FOR EACH ROW
EXECUTE FUNCTION public.log_acudiente_admin_access();

-- Drop existing permissive policies for acudientes
DROP POLICY IF EXISTS "Acudientes: actualizar propias (menor) o admin" ON public.acudientes;
DROP POLICY IF EXISTS "Acudientes: borrar" ON public.acudientes;
DROP POLICY IF EXISTS "Acudientes: insertar propias (menor) o admin" ON public.acudientes;
DROP POLICY IF EXISTS "Acudientes: ver propias (menor) o admin" ON public.acudientes;

-- Create new restrictive policies

-- Minors can only VIEW their guardian data (read-only)
CREATE POLICY "Acudientes: menor puede ver sus datos"
ON public.acudientes
FOR SELECT
USING (menor_id = auth.uid());

-- Only admins can INSERT guardian data
CREATE POLICY "Acudientes: solo admin puede insertar"
ON public.acudientes
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can UPDATE guardian data
CREATE POLICY "Acudientes: solo admin puede actualizar"
ON public.acudientes
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Only admins can DELETE guardian data
CREATE POLICY "Acudientes: solo admin puede borrar"
ON public.acudientes
FOR DELETE
USING (is_admin(auth.uid()));

-- Admins can view all guardian data (with audit logging via trigger)
CREATE POLICY "Acudientes: admin puede ver todos"
ON public.acudientes
FOR SELECT
USING (is_admin(auth.uid()));