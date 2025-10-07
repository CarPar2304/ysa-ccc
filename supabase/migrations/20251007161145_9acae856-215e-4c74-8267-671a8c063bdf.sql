-- Create a safe function to get public user profile info
-- This allows social features to work without exposing sensitive PII

CREATE OR REPLACE FUNCTION public.get_public_user_profiles(user_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  nombres text,
  apellidos text,
  avatar_url text,
  biografia text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    nombres,
    apellidos,
    avatar_url,
    biografia
  FROM public.usuarios
  WHERE 
    CASE 
      WHEN user_ids IS NOT NULL THEN id = ANY(user_ids)
      ELSE true
    END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_user_profiles TO authenticated;

-- Create a simpler function for searching users (for mentions)
CREATE OR REPLACE FUNCTION public.search_users(search_term text)
RETURNS TABLE (
  id uuid,
  nombres text,
  apellidos text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    nombres,
    apellidos,
    avatar_url
  FROM public.usuarios
  WHERE 
    nombres ILIKE '%' || search_term || '%' 
    OR apellidos ILIKE '%' || search_term || '%'
  LIMIT 10;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users TO authenticated;