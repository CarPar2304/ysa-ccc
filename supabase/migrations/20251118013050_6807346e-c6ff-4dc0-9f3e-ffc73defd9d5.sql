-- Crear bucket para imágenes de módulos y clases
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-images', 'lab-images', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de storage para el bucket lab-images
-- Permitir a todos ver las imágenes (público)
CREATE POLICY "Las imágenes son públicamente accesibles"
ON storage.objects FOR SELECT
USING (bucket_id = 'lab-images');

-- Permitir a admins subir imágenes
CREATE POLICY "Solo admins pueden subir imágenes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lab-images' 
  AND is_admin(auth.uid())
);

-- Permitir a admins actualizar imágenes
CREATE POLICY "Solo admins pueden actualizar imágenes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lab-images' 
  AND is_admin(auth.uid())
);

-- Permitir a admins eliminar imágenes
CREATE POLICY "Solo admins pueden eliminar imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lab-images' 
  AND is_admin(auth.uid())
);