-- ══════════════════════════════════════════════════════════════
-- SOMLITS — premises photos storage bucket + table
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'premises-photos',
  'premises-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS — allow authenticated users to upload
CREATE POLICY "Authenticated users can upload premises photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'premises-photos');

-- 3. Storage RLS — anyone can view (bucket is public)
CREATE POLICY "Public can view premises photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'premises-photos');

-- 4. Storage RLS — authenticated users can delete
CREATE POLICY "Authenticated users can delete premises photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'premises-photos');

-- 5. Create the photos metadata table
CREATE TABLE IF NOT EXISTS farmer_premises_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  premises_id  uuid        NOT NULL REFERENCES farmer_premises(id) ON DELETE CASCADE,
  photo_url    text        NOT NULL,
  file_name    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on the table
ALTER TABLE farmer_premises_photos ENABLE ROW LEVEL SECURITY;

-- 7. Table RLS — users can only see/manage photos for their own premises
CREATE POLICY "Users manage their own premises photos"
ON farmer_premises_photos
FOR ALL
TO authenticated
USING (
  premises_id IN (
    SELECT id FROM farmer_premises WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  premises_id IN (
    SELECT id FROM farmer_premises WHERE user_id = auth.uid()
  )
);
