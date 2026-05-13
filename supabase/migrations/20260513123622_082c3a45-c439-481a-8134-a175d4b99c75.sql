
-- 1. Remove overly broad storage upload policies
DROP POLICY IF EXISTS "Authenticated users can upload lab images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;

-- 2. Remove broad role-enumeration policy on user_roles
DROP POLICY IF EXISTS "Usuarios autenticados: ver roles" ON public.user_roles;

-- 3. Tighten entregas storage SELECT for mentors
DROP POLICY IF EXISTS "Users can view own submissions or editors can view all" ON storage.objects;

CREATE POLICY "Entregas: own files or assigned editors"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'entregas' AND (
    -- Owner of file (folder name = user id)
    (auth.uid())::text = (storage.foldername(name))[1]
    -- Admins
    OR public.is_admin(auth.uid())
    -- Mentors only if assigned to the emprendimiento of the file owner
    OR (
      public.is_mentor(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.emprendimientos e
        WHERE e.user_id::text = (storage.foldername(name))[1]
          AND public.mentor_has_emprendimiento(auth.uid(), e.id)
      )
    )
    -- Cofounders of the file owner's emprendimiento
    OR EXISTS (
      SELECT 1
      FROM public.emprendimiento_miembros em
      JOIN public.emprendimiento_miembros em2
        ON em.emprendimiento_id = em2.emprendimiento_id
      WHERE em.user_id = auth.uid()
        AND em2.user_id::text = (storage.foldername(name))[1]
    )
  )
);
