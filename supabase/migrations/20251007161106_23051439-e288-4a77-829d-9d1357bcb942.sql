-- Remove the view that triggered security warnings
DROP VIEW IF EXISTS public.usuarios_publicos;

-- The security model is now:
-- 1. Users can see their own complete data
-- 2. Admins can see all data  
-- 3. Mentors can see their assigned beneficiaries' data
-- 4. Application code must query only public columns (nombres, apellidos, avatar_url, biografia)
--    for social features to avoid exposing sensitive PII