-- Storage policies for post-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Allow anyone to view post images (public bucket)
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

-- Allow users to delete their own post images
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Also ensure lab-images bucket allows authenticated uploads (used by news editor)
CREATE POLICY "Authenticated users can upload lab images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lab-images');

CREATE POLICY "Anyone can view lab images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lab-images');