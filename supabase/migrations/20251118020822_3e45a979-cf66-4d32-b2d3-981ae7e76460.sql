-- Crear bucket para imágenes de perfiles de mentoría
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentoria-images', 'mentoria-images', true);

-- Política: Cualquiera puede ver las imágenes (bucket público)
CREATE POLICY "Imágenes de mentoría son públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'mentoria-images');

-- Política: Solo mentores pueden subir sus propias imágenes
CREATE POLICY "Mentores pueden subir sus imágenes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mentoria-images' 
  AND is_mentor(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Solo mentores pueden actualizar sus propias imágenes
CREATE POLICY "Mentores pueden actualizar sus imágenes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mentoria-images' 
  AND is_mentor(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Solo mentores pueden eliminar sus propias imágenes
CREATE POLICY "Mentores pueden eliminar sus imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mentoria-images' 
  AND is_mentor(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);