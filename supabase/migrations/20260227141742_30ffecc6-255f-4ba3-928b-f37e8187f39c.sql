-- Allow mentors (with module edit permission) to upload to lab-images bucket
CREATE POLICY "Mentores pueden subir a lab-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab-images'
  AND is_mentor(auth.uid())
);

-- Allow mentors to update their uploads in lab-images
CREATE POLICY "Mentores pueden actualizar en lab-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lab-images'
  AND is_mentor(auth.uid())
);

-- Allow mentors to delete in lab-images
CREATE POLICY "Mentores pueden eliminar en lab-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab-images'
  AND is_mentor(auth.uid())
);