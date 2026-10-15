-- facility-pens.sql
-- Run once in Supabase SQL editor.
-- Creates the facility_pens table so quarantine supervisors can define
-- individual holding pens with separate capacities and species.

-- If the table already exists without current_count, add the column:
ALTER TABLE facility_pens ADD COLUMN IF NOT EXISTS current_count int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS facility_pens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid        NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  pen_code    text        NOT NULL,           -- e.g. "A", "B", "Pen 1", "Block 3"
  pen_name    text,                           -- optional long name
  capacity      int         NOT NULL DEFAULT 1, -- max animals this pen holds
  current_count int         NOT NULL DEFAULT 0, -- animals currently inside
  species       text[],                          -- CATTLE | CAMEL | GOAT | SHEEP
  status        text        NOT NULL DEFAULT 'AVAILABLE',
  -- Values: AVAILABLE | OCCUPIED | MAINTENANCE
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_pens_facility ON facility_pens(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_pens_status   ON facility_pens(status);

ALTER TABLE facility_pens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pens_select      ON facility_pens;
DROP POLICY IF EXISTS pens_insert      ON facility_pens;
DROP POLICY IF EXISTS pens_update      ON facility_pens;
DROP POLICY IF EXISTS pens_delete      ON facility_pens;
DROP POLICY IF EXISTS pens_select_anon ON facility_pens;
DROP POLICY IF EXISTS pens_insert_anon ON facility_pens;
DROP POLICY IF EXISTS pens_update_anon ON facility_pens;
DROP POLICY IF EXISTS pens_delete_anon ON facility_pens;

CREATE POLICY pens_select      ON facility_pens FOR SELECT TO authenticated USING (true);
CREATE POLICY pens_insert      ON facility_pens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pens_update      ON facility_pens FOR UPDATE TO authenticated USING (true);
CREATE POLICY pens_delete      ON facility_pens FOR DELETE TO authenticated USING (true);

-- Dev / anon access (for SOMADMIN dev login)
CREATE POLICY pens_select_anon ON facility_pens FOR SELECT TO anon USING (true);
CREATE POLICY pens_insert_anon ON facility_pens FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY pens_update_anon ON facility_pens FOR UPDATE TO anon USING (true);
CREATE POLICY pens_delete_anon ON facility_pens FOR DELETE TO anon USING (true);
