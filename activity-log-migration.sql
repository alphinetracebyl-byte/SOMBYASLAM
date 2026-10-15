-- ── Activity Log ─────────────────────────────────────────────────────────────
-- Central audit/activity table shared by all three portals (Farmer, Field, Ministry).
-- Each portal writes its own events; region-based filtering is enforced in app code.

CREATE TABLE IF NOT EXISTS activity_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal         TEXT        NOT NULL CHECK (portal IN ('FARMER', 'FIELD', 'MINISTRY')),
  category       TEXT        NOT NULL,
  level          TEXT        NOT NULL CHECK (level IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR')),
  title          TEXT        NOT NULL,
  detail         TEXT,
  actor_name     TEXT,
  actor_role     TEXT,
  region         TEXT,
  district       TEXT,
  reference_code TEXT,
  user_id        UUID,
  farmer_id      UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_region     ON activity_log (region);
CREATE INDEX IF NOT EXISTS idx_activity_log_portal     ON activity_log (portal);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_farmer_id  ON activity_log (farmer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_category   ON activity_log (category);
CREATE INDEX IF NOT EXISTS idx_activity_log_level      ON activity_log (level);

-- RLS: authenticated users can insert and read
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL);
