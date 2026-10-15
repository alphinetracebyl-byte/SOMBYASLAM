-- ══════════════════════════════════════════════════════════════
-- SOMLITS — allow ministry portal (anon) to read premises photos
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Allow anon (ministry portal) to read all premises photos metadata
CREATE POLICY "anon_read_premises_photos"
  ON farmer_premises_photos FOR SELECT
  TO anon
  USING (true);
