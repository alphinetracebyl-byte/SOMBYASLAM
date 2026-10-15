-- ══════════════════════════════════════════════════════════════════════════════
-- SOMLITS — Tag Inventory & Tag Requests per Premises
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Tag inventory summary per premises (Ministry updates available/delivered)
CREATE TABLE IF NOT EXISTS farmer_tag_inventory (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  premises_id   uuid        NOT NULL REFERENCES farmer_premises(id) ON DELETE CASCADE,
  available     integer     NOT NULL DEFAULT 0 CHECK (available >= 0),
  used          integer     NOT NULL DEFAULT 0 CHECK (used >= 0),
  delivered     integer     NOT NULL DEFAULT 0 CHECK (delivered >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE farmer_tag_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_tag_inventory"
  ON farmer_tag_inventory FOR SELECT TO authenticated
  USING (premises_id IN (SELECT id FROM farmer_premises WHERE user_id = auth.uid()));

CREATE POLICY "owner_manage_tag_inventory"
  ON farmer_tag_inventory FOR ALL TO authenticated
  USING (premises_id IN (SELECT id FROM farmer_premises WHERE user_id = auth.uid()))
  WITH CHECK (premises_id IN (SELECT id FROM farmer_premises WHERE user_id = auth.uid()));

-- 2. Tag requests submitted by farmers
CREATE TABLE IF NOT EXISTS farmer_tag_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  premises_id      uuid        NOT NULL REFERENCES farmer_premises(id) ON DELETE CASCADE,
  user_id          text        NOT NULL,
  quantity         integer     NOT NULL CHECK (quantity > 0),
  tag_type         text        NOT NULL DEFAULT 'RFID'
                     CHECK (tag_type IN ('RFID', 'EAR_TAG', 'BOTH')),
  purpose          text        CHECK (purpose IN ('NEWBORN', 'REPLACEMENT', 'OTHER')),
  reason           text,
  contact_person   text,
  phone            text,
  physical_address text,
  status           text        NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'DELIVERED')),
  requested_at     timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  notes            text
);

-- If the table already exists, add the new columns (safe to run on existing DB)
ALTER TABLE farmer_tag_requests
  ADD COLUMN IF NOT EXISTS purpose          text,
  ADD COLUMN IF NOT EXISTS contact_person   text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS physical_address text,
  ADD COLUMN IF NOT EXISTS latitude         numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude        numeric(10,7);

ALTER TABLE farmer_tag_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_tag_requests"
  ON farmer_tag_requests FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- 3. Indexes
CREATE INDEX idx_tag_inventory_premises ON farmer_tag_inventory(premises_id);
CREATE INDEX idx_tag_requests_premises  ON farmer_tag_requests(premises_id);
CREATE INDEX idx_tag_requests_user      ON farmer_tag_requests(user_id);
CREATE INDEX idx_tag_requests_status    ON farmer_tag_requests(status);
