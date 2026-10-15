-- ============================================================
-- SOMLITS — farmer_movement_requests table
-- Run in Supabase SQL editor or via migration tooling
-- ============================================================

-- farmer_movement_requests table
CREATE TABLE IF NOT EXISTS farmer_movement_requests (
  id                        uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_code             text          NOT NULL UNIQUE,
  status                    text          NOT NULL DEFAULT 'SUBMITTED',
  user_id                   uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_premises_code      text          NOT NULL,
  origin_premises_name      text          NOT NULL,
  origin_region_code        text          NOT NULL,
  destination_premises_code text          NOT NULL,
  destination_premises_name text,
  movement_type_code        text          NOT NULL,
  purpose                   text          NOT NULL,
  planned_departure_date    date          NOT NULL,
  planned_arrival_date      date          NOT NULL,
  vehicle_registration      text          NOT NULL,
  vehicle_type              text,
  transporter_name          text          NOT NULL,
  transporter_phone         text,
  driver_licence_number     text,
  route_description         text,
  animal_ids                jsonb         NOT NULL DEFAULT '[]',
  animal_count              integer       NOT NULL DEFAULT 0,
  rejection_reason          text,
  notes                     text,
  created_at                timestamptz   DEFAULT now(),
  updated_at                timestamptz   DEFAULT now()
);

-- Enable row-level security
ALTER TABLE farmer_movement_requests ENABLE ROW LEVEL SECURITY;

-- Farmers can read and write their own movement requests
CREATE POLICY "farmer_own_movements"
  ON farmer_movement_requests FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous read (e.g. public permit lookup) — remove if not required
CREATE POLICY "anon_read_movements"
  ON farmer_movement_requests FOR SELECT
  TO anon
  USING (true);

-- updated_at trigger (reuse set_updated_at if it already exists in the project)
CREATE TRIGGER trg_farmer_movement_requests_updated
  BEFORE UPDATE ON farmer_movement_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_fmr_user_id        ON farmer_movement_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_fmr_status         ON farmer_movement_requests (status);
CREATE INDEX IF NOT EXISTS idx_fmr_movement_code  ON farmer_movement_requests (movement_code);
CREATE INDEX IF NOT EXISTS idx_fmr_origin_code    ON farmer_movement_requests (origin_premises_code);
CREATE INDEX IF NOT EXISTS idx_fmr_dest_code      ON farmer_movement_requests (destination_premises_code);
CREATE INDEX IF NOT EXISTS idx_fmr_created_at     ON farmer_movement_requests (created_at DESC);
