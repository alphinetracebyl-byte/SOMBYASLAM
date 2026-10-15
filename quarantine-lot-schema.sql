-- quarantine-lot-schema.sql
-- Run once in Supabase SQL editor.
-- Extends the quarantine schema to support international lot-based practices
-- (WOAH / Horn of Africa standards for large-scale export quarantine).

-- ── 1. Extend quarantine_batches with lot-level fields ─────────────────────────

ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS exporter_name          text;
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS destination_country     text;          -- SAUDI_ARABIA | UAE | OMAN | QATAR | EGYPT | OTHER
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS import_permit_number    text;
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS species                 text;          -- CATTLE | CAMEL | GOAT | SHEEP
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS sample_collection_date  date;          -- quarantine clock starts here (not arrival date)
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS required_quarantine_days int DEFAULT 21;
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS earliest_export_date    date;          -- computed: sample_collection_date + required_quarantine_days
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS ectoparasite_treated    boolean DEFAULT false;
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS ectoparasite_product    text;
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS source_region           text;
ALTER TABLE quarantine_batches ADD COLUMN IF NOT EXISTS lot_closed              boolean NOT NULL DEFAULT false;  -- true = all-in all-out lock

-- ── 2. Lot-level vaccination events ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quarantine_vaccinations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            uuid        NOT NULL REFERENCES quarantine_batches(id) ON DELETE CASCADE,
  facility_id         uuid        NOT NULL,
  vaccine_name        text        NOT NULL,
  -- RVF | PPR | FMD | SHEEP_POX | CAMEL_POX | PASTEURELLOSIS | BRUCELLOSIS | CBPP | CCPP | OTHER
  vaccine_batch_no    text,
  dose_ml             numeric,
  route               text        DEFAULT 'SC',  -- SC | IM | ORAL | INTRANASAL
  animals_vaccinated  int         NOT NULL,
  administered_date   date        NOT NULL DEFAULT CURRENT_DATE,
  administered_by     text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qvax_batch ON quarantine_vaccinations(batch_id);

-- ── 3. Lot-level daily inspection records ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS quarantine_daily_inspections (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                uuid        NOT NULL REFERENCES quarantine_batches(id) ON DELETE CASCADE,
  facility_id             uuid        NOT NULL,
  inspection_date         date        NOT NULL DEFAULT CURRENT_DATE,
  day_number              int,                   -- computed: inspection_date - admission_date + 1
  inspector_name          text,
  overall_status          text        NOT NULL DEFAULT 'SATISFACTORY',
  -- SATISFACTORY | REQUIRES_ATTENTION | CRITICAL
  animals_checked         int,
  animals_showing_signs   int         NOT NULL DEFAULT 0,
  mortalities_today       int         NOT NULL DEFAULT 0,
  feed_adequate           boolean     NOT NULL DEFAULT true,
  water_adequate          boolean     NOT NULL DEFAULT true,
  pen_condition           text        NOT NULL DEFAULT 'GOOD',  -- GOOD | FAIR | POOR
  findings                text,
  actions_taken           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, inspection_date)             -- one record per lot per day
);

CREATE INDEX IF NOT EXISTS idx_qinsp_batch ON quarantine_daily_inspections(batch_id);
CREATE INDEX IF NOT EXISTS idx_qinsp_date  ON quarantine_daily_inspections(inspection_date);

-- ── 4. RFID bulk records (linked to lot, imported from scanner) ─────────────────

CREATE TABLE IF NOT EXISTS quarantine_rfid_records (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    uuid        NOT NULL REFERENCES quarantine_batches(id) ON DELETE CASCADE,
  facility_id uuid        NOT NULL,
  tag_number  text        NOT NULL,
  species     text,
  upload_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, tag_number)
);

CREATE INDEX IF NOT EXISTS idx_qrfid_batch ON quarantine_rfid_records(batch_id);

-- ── 5. Individual animal exception records (sick / dead / rejected only) ────────
-- quarantine_batch_animals already exists — add missing columns if needed

ALTER TABLE quarantine_batch_animals ADD COLUMN IF NOT EXISTS pen_id         uuid;
ALTER TABLE quarantine_batch_animals ADD COLUMN IF NOT EXISTS pen_code       text;
ALTER TABLE quarantine_batch_animals ADD COLUMN IF NOT EXISTS exception_type text DEFAULT 'SICK';
-- SICK | DEAD | REJECTED | ISOLATED

-- ── 6. RLS — enable on new tables ──────────────────────────────────────────────

ALTER TABLE quarantine_vaccinations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_daily_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_rfid_records      ENABLE ROW LEVEL SECURITY;

-- authenticated policies
CREATE POLICY qvax_auth_all  ON quarantine_vaccinations      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY qinsp_auth_all ON quarantine_daily_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY qrfid_auth_all ON quarantine_rfid_records      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- anon policies (SOMADMIN dev login)
CREATE POLICY qvax_anon_sel  ON quarantine_vaccinations      FOR SELECT TO anon USING (true);
CREATE POLICY qvax_anon_ins  ON quarantine_vaccinations      FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY qvax_anon_upd  ON quarantine_vaccinations      FOR UPDATE TO anon USING (true);

CREATE POLICY qinsp_anon_sel ON quarantine_daily_inspections FOR SELECT TO anon USING (true);
CREATE POLICY qinsp_anon_ins ON quarantine_daily_inspections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY qinsp_anon_upd ON quarantine_daily_inspections FOR UPDATE TO anon USING (true);

CREATE POLICY qrfid_anon_sel ON quarantine_rfid_records      FOR SELECT TO anon USING (true);
CREATE POLICY qrfid_anon_ins ON quarantine_rfid_records      FOR INSERT TO anon WITH CHECK (true);
