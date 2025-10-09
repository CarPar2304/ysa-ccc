-- Fix Security Issue: Remove SECURITY DEFINER view
-- Views in PostgreSQL execute with the permissions of the view creator, 
-- which can bypass Row Level Security (RLS) policies. Since this view
-- is not being used in the application code, we can safely remove it.

-- Drop the evaluaciones_promedio view
DROP VIEW IF EXISTS public.evaluaciones_promedio;

-- If this view is needed in the future, the functionality should be
-- implemented using direct queries in the application code or using
-- a SECURITY INVOKER function that properly respects RLS policies.