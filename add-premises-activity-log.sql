-- ══════════════════════════════════════════════════════════════
-- SOMLITS — Add premises_id to activity_log
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS premises_id UUID;

CREATE INDEX IF NOT EXISTS idx_activity_log_premises_id ON activity_log (premises_id);

-- Allow anon (ministry portal) to insert and read activity logs
-- (ministry officers are authenticated, but this is a safety net)
CREATE POLICY "anon_insert_activity_log" ON activity_log
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select_activity_log" ON activity_log
  FOR SELECT TO anon USING (true);
