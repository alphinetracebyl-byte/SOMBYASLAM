-- slaughter-schema.sql
-- Run once in Supabase SQL editor.
-- Creates the full slaughterhouse module schema for SOMLITS.

-- ── 1. Slaughter Records (master record per animal) ─────────────────────────

CREATE TABLE IF NOT EXISTS slaughter_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_code        text        NOT NULL UNIQUE,             -- SL-{facility}-{ts}
  facility_id           uuid        NOT NULL,
  facility_code         text        NOT NULL,
  movement_permit_id    uuid,                                    -- optional link to permit
  session_date          date        NOT NULL DEFAULT CURRENT_DATE,
  animal_id             uuid,                                    -- link to national LITS animal record
  tag_number            text        NOT NULL,
  species               text        NOT NULL,                    -- CATTLE | CAMEL | SHEEP | GOAT
  origin_facility_code  text,
  owner_name            text,
  pen_assignment        text,
  arrival_condition     text        NOT NULL DEFAULT 'HEALTHY',  -- HEALTHY | SICK | INJURED | DEAD
  status                text        NOT NULL DEFAULT 'RECEIVED',
  -- RECEIVED | ANTE_MORTEM_PENDING | ANTE_MORTEM_PASSED | DETAINED | REJECTED
  -- | SLAUGHTERED | POST_MORTEM_PASSED | CONDEMNED | DISPATCHED
  slaughter_date        date,
  slaughter_time        text,                                    -- HH:MM
  slaughter_line        text,
  carcass_code          text UNIQUE,                             -- CARC-{slaughter_code}
  weight_before_kg      numeric,
  carcass_weight_kg     numeric,
  received_by_name      text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sl_facility  ON slaughter_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_sl_status    ON slaughter_records(status);
CREATE INDEX IF NOT EXISTS idx_sl_date      ON slaughter_records(session_date);
CREATE INDEX IF NOT EXISTS idx_sl_tag       ON slaughter_records(tag_number);
CREATE INDEX IF NOT EXISTS idx_sl_carcass   ON slaughter_records(carcass_code);

-- ── 2. Ante-mortem Inspections ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ante_mortem_inspections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_id        uuid        NOT NULL REFERENCES slaughter_records(id) ON DELETE CASCADE,
  facility_id         uuid        NOT NULL,
  tag_number          text        NOT NULL,
  inspection_date     date        NOT NULL DEFAULT CURRENT_DATE,
  inspector_id        text        NOT NULL,
  inspector_name      text        NOT NULL,
  health_condition    text,                        -- Good | Normal | Poor | Emaciated
  behaviour           text,                        -- Alert | Lethargic | Aggressive
  mobility            text,                        -- Normal | Lame | Hesitant
  injuries            text,
  visible_symptoms    text,
  testing_required    boolean     NOT NULL DEFAULT false,
  isolation_required  boolean     NOT NULL DEFAULT false,
  decision            text        NOT NULL DEFAULT 'FIT',
  -- FIT | CONDITIONALLY_FIT | DETAINED | UNFIT | EMERGENCY
  conditions          text,                        -- if CONDITIONALLY_FIT or DETAINED
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ami_slaughter ON ante_mortem_inspections(slaughter_id);
CREATE INDEX IF NOT EXISTS idx_ami_facility  ON ante_mortem_inspections(facility_id);

-- ── 3. Halal Verifications ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS halal_verifications (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_id           uuid        NOT NULL REFERENCES slaughter_records(id) ON DELETE CASCADE,
  facility_id            uuid        NOT NULL,
  tag_number             text        NOT NULL,
  verification_date      date        NOT NULL DEFAULT CURRENT_DATE,
  slaughter_time         text,
  verified_by_id         text        NOT NULL,
  verified_by_name       text        NOT NULL,
  slaughterer_name       text,
  slaughterer_verified   boolean     NOT NULL DEFAULT true,
  animal_alive_confirmed boolean     NOT NULL DEFAULT true,
  slaughter_method       text        DEFAULT 'MANUAL_ZABIHA',  -- MANUAL_ZABIHA | MECHANICAL
  stunning_used          boolean     NOT NULL DEFAULT false,
  stunning_method        text,
  equipment_condition    text        DEFAULT 'GOOD',           -- GOOD | ACCEPTABLE | POOR | FAILED
  tasmiyah_recited       boolean     NOT NULL DEFAULT true,
  non_compliance_notes   text,
  decision               text        NOT NULL DEFAULT 'HALAL', -- HALAL | DOUBTFUL | NON_HALAL
  rejection_reason       text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hv_slaughter ON halal_verifications(slaughter_id);
CREATE INDEX IF NOT EXISTS idx_hv_facility  ON halal_verifications(facility_id);

-- ── 4. Post-mortem Inspections ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_mortem_inspections (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_id         uuid        NOT NULL REFERENCES slaughter_records(id) ON DELETE CASCADE,
  facility_id          uuid        NOT NULL,
  carcass_code         text        NOT NULL,
  inspection_date      date        NOT NULL DEFAULT CURRENT_DATE,
  inspector_id         text        NOT NULL,
  inspector_name       text        NOT NULL,
  carcass_condition    text,
  head_findings        text,                   -- lymph nodes, tongue, nasal mucosa
  organ_findings       text,                   -- liver, lungs, heart, kidneys, spleen
  visible_lesions      text,
  contamination        text,                   -- faecal, chemical, other
  suspected_disease    text,
  samples_collected    boolean     NOT NULL DEFAULT false,
  sample_details       text,
  decision             text        NOT NULL DEFAULT 'PASSED',
  -- PASSED | CONDITIONALLY_PASSED | CONDEMNED
  conditions_notes     text,                   -- for CONDITIONALLY_PASSED
  condemnation_reason  text,
  condemned_parts      text,                   -- e.g. "Whole carcass" | "Liver, Lungs"
  condemned_weight_kg  numeric,
  disposal_method      text,                   -- INCINERATION | BURIAL | RENDERING
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pmi_slaughter ON post_mortem_inspections(slaughter_id);
CREATE INDEX IF NOT EXISTS idx_pmi_facility  ON post_mortem_inspections(facility_id);
CREATE INDEX IF NOT EXISTS idx_pmi_carcass   ON post_mortem_inspections(carcass_code);

-- ── 5. Export Consignments ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS export_consignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_code  text        NOT NULL UNIQUE,      -- CONS-{facility}-{ts}
  facility_id       uuid        NOT NULL,
  facility_code     text        NOT NULL,
  status            text        NOT NULL DEFAULT 'LOADING',
  -- LOADING | LOADED | IN_TRANSIT | CLEARED | RETURNED
  destination       text,
  exporter_name     text,
  container_vehicle text,
  container_seal    text,
  loading_date      date,
  loading_time      text,
  total_items       int         NOT NULL DEFAULT 0,
  total_weight_kg   numeric,
  supervisor_name   text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cons_facility ON export_consignments(facility_id);
CREATE INDEX IF NOT EXISTS idx_cons_status   ON export_consignments(status);

-- ── 6. Consignment Items (carcasses in a consignment) ──────────────────────

CREATE TABLE IF NOT EXISTS consignment_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id    uuid        NOT NULL REFERENCES export_consignments(id) ON DELETE CASCADE,
  facility_id       uuid        NOT NULL,
  slaughter_id      uuid        NOT NULL REFERENCES slaughter_records(id),
  carcass_code      text        NOT NULL,
  tag_number        text,
  species           text,
  carcass_weight_kg numeric,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_consignment ON consignment_items(consignment_id);
CREATE INDEX IF NOT EXISTS idx_ci_slaughter   ON consignment_items(slaughter_id);

-- ── 7. Row Level Security ───────────────────────────────────────────────────

ALTER TABLE slaughter_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ante_mortem_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE halal_verifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mortem_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_consignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_items       ENABLE ROW LEVEL SECURITY;

-- authenticated: full access
CREATE POLICY sl_auth_all   ON slaughter_records       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ami_auth_all  ON ante_mortem_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY hv_auth_all   ON halal_verifications     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pmi_auth_all  ON post_mortem_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY cons_auth_all ON export_consignments     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ci_auth_all   ON consignment_items       FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- anon: SOMADMIN dev login (added separately in dev-anon-read-policies.sql)
