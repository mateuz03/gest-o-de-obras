-- 1. Coluna de capa na tabela analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- 2. Bucket público para capas de projeto
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-covers', 'project-covers', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies de storage para o bucket project-covers
DROP POLICY IF EXISTS "Project covers are publicly accessible" ON storage.objects;
CREATE POLICY "Project covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-covers');

DROP POLICY IF EXISTS "Users can upload their own project covers" ON storage.objects;
CREATE POLICY "Users can upload their own project covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own project covers" ON storage.objects;
CREATE POLICY "Users can update their own project covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own project covers" ON storage.objects;
CREATE POLICY "Users can delete their own project covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);