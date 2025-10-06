-- Crear tabla para etiquetas de usuarios en posts
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Políticas: ver tags de todos los posts visibles
CREATE POLICY "Post tags: ver todos autenticados"
ON public.post_tags
FOR SELECT
USING (true);

-- Crear tags solo el autor del post
CREATE POLICY "Post tags: crear solo autor del post"
ON public.post_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_tags.post_id
    AND posts.user_id = auth.uid()
  )
);

-- Borrar tags solo el autor del post
CREATE POLICY "Post tags: borrar solo autor del post"
ON public.post_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_tags.post_id
    AND posts.user_id = auth.uid()
  )
);