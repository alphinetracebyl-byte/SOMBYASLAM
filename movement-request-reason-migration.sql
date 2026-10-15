-- ─────────────────────────────────────────────────────────────────────────────
-- SOMLITS — Fix: allow staff to read movement requests + add request_reason
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Allow all authenticated users (inspectors, ministry, vets) to read
--    movement requests. The existing "farmer_own_movements" policy already
--    covers farmer read/write of their own records. This adds staff read.
--    Permissive policies are OR'd, so farmers keep full access to their own.
DROP POLICY IF EXISTS "staff_read_all_movements" ON farmer_movement_requests;
CREATE POLICY "staff_read_all_movements"
  ON farmer_movement_requests FOR SELECT
  TO authenticated
  USING (true);

-- 2. Add request_reason directly to movement_tasks so inspectors can read
--    it without a cross-table join (movement_tasks already has open RLS).
ALTER TABLE movement_tasks
  ADD COLUMN IF NOT EXISTS request_reason TEXT;

COMMIT;
