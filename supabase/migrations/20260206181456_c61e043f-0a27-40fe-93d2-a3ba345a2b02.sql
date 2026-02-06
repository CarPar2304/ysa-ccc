-- Fix linter warnings: move 'vector' extension out of public and set search_path for match_documents

CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension from public -> extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Ensure match_documents has an explicit, safe search_path
ALTER FUNCTION public.match_documents(extensions.vector, integer, jsonb)
SET search_path = public, extensions;
