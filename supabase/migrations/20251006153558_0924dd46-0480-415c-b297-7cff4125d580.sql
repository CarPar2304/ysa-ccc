-- Crear bucket para imágenes de posts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para post-images bucket
CREATE POLICY "Post images: ver todos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Post images: subir solo beneficiarios"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' 
  AND is_beneficiario(auth.uid())
);

CREATE POLICY "Post images: actualizar solo dueño"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Post images: borrar solo dueño"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);