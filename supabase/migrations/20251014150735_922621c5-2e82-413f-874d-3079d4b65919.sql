-- Enable RLS on documents table (CRITICAL SECURITY FIX)
-- This table contains 89 rows of sensitive vector embeddings and content
-- that are currently publicly accessible

-- 1. Enable Row-Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2. Revoke public access (service role only)
-- This is a vector database table that should only be accessed via edge functions
REVOKE ALL ON public.documents FROM authenticated;
REVOKE ALL ON public.documents FROM anon;

-- 3. Add admin-only policy for management
CREATE POLICY "Admins can manage documents"
ON public.documents
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Note: No general user access policies - this data should be accessed
-- only via edge functions using the service role key for vector search