-- ══════════════════════════════════════════════════════════════
-- SOMLITS — allow ministry portal (anon) to update premises status
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Drop the old RPC approach if you already ran it
DROP FUNCTION IF EXISTS update_premises_status(uuid, text);

-- Allow anon (ministry portal) to update farmer_premises rows
CREATE POLICY "anon_update_premises_status"
  ON farmer_premises FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
