-- =============================================================================
-- SOMLITS Facility Portal Schema
-- Quarantine Station + Slaughterhouse operational tables
-- Safe to run multiple times (IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Quarantine Batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quarantine_batches (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code              text        NOT NULL UNIQUE,
  facility_id             uuid        NOT NULL REFERENCES facilities(id),
  facility_code           text        NOT NULL,
  movement_permit_id      uuid,       -- references movement_permits(id) in the movement module
  vehicle_reg             text,       -- captured at arrival
  driver_name             text,
  seal_number             text,
  permit_qr_data          text,
  status                  text        NOT NULL DEFAULT 'ADMITTED',
  -- ADMITTED | ACTIVE | ON_HOLD | CLEARED | CLOSED
  quarantine_purpose      text        NOT NULL DEFAULT 'EXPORT',
  -- EXPORT | IMPORT | DISEASE_CONTROL | ROUTINE
  pen_assignment          text,
  isolation_pen           text,
  admission_date          date        NOT NULL DEFAULT CURRENT_DATE,
  quarantine_days         int         NOT NULL DEFAULT 21,
  expected_completion_date date,
  actual_completion_date  date,
  animal_count            int         NOT NULL DEFAULT 0,
  vet_officer_id          text,
  vet_officer_name        text,
  health_hold_reason      text,
  notes                   text,
  created_by_id           text,
  created_by_name         text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Quarantine Batch Animals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quarantine_batch_animals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          uuid        NOT NULL REFERENCES quarantine_batches(id) ON DELETE CASCADE,
  facility_id       uuid        NOT NULL,
  animal_id         text,               -- reference to external animals table
  tag_number        text,
  species           text        NOT NULL,
  sex               text,
  estimated_age     text,
  weight_kg         numeric(8,2),
  pen_assignment    text,
  isolation_required boolean    NOT NULL DEFAULT false,
  arrival_condition text        NOT NULL DEFAULT 'HEALTHY',
  -- HEALTHY | SICK | INJURED | DEAD
  status            text        NOT NULL DEFAULT 'ACTIVE',
  -- ACTIVE | ON_HOLD | CLEARED | DEAD | MISSING | REJECTED
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Health Inspections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_inspections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_code     text        NOT NULL UNIQUE,
  batch_id            uuid        NOT NULL REFERENCES quarantine_batches(id),
  facility_id         uuid        NOT NULL,
  inspection_type     text        NOT NULL,
  -- ADMISSION | PERIODIC | SUSPECTED_DISEASE | FINAL_RELEASE
  inspection_date     date        NOT NULL DEFAULT CURRENT_DATE,
  inspector_id        text        NOT NULL,
  inspector_name      text        NOT NULL,
  status              text        NOT NULL DEFAULT 'PENDING',
  -- PENDING | IN_PROGRESS | COMPLETED
  general_health      text,       -- GOOD | FAIR | POOR | CRITICAL
  behaviour           text,
  temperature_avg     numeric(5,2),
  clinical_observations text,
  symptoms            text[],
  injuries            text,
  fitness_assessment  text,
  vet_recommendation  text,
  -- CLEAR | EXTEND_QUARANTINE | ISOLATE | COLLECT_SAMPLE | TREAT | PROHIBIT_MOVEMENT
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Lab Samples
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_samples (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_code           text        NOT NULL UNIQUE,
  batch_id              uuid        NOT NULL REFERENCES quarantine_batches(id),
  facility_id           uuid        NOT NULL,
  animal_id             text,           -- optional specific animal
  tag_number            text,
  sample_type           text        NOT NULL,
  -- BLOOD | NASAL_SWAB | RECTAL_SWAB | TISSUE | URINE | FECES | OTHER
  test_type             text        NOT NULL,
  collection_date       date        NOT NULL DEFAULT CURRENT_DATE,
  collector_id          text        NOT NULL,
  collector_name        text        NOT NULL,
  lab_destination       text,
  chain_of_custody      jsonb       DEFAULT '[]',
  status                text        NOT NULL DEFAULT 'COLLECTED',
  -- COLLECTED | SENT | RECEIVED | PROCESSED | RESULTED
  result                text        NOT NULL DEFAULT 'PENDING',
  -- PENDING | POSITIVE | NEGATIVE | INCONCLUSIVE | RETEST_REQUIRED
  result_date           date,
  result_notes          text,
  auto_hold_triggered   boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Daily Monitoring Records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_monitoring_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id              uuid        NOT NULL REFERENCES quarantine_batches(id),
  facility_id           uuid        NOT NULL,
  monitoring_date       date        NOT NULL DEFAULT CURRENT_DATE,
  recorded_by_id        text        NOT NULL,
  recorded_by_name      text        NOT NULL,
  feed_available        boolean     NOT NULL DEFAULT true,
  water_available       boolean     NOT NULL DEFAULT true,
  general_behaviour     text,       -- NORMAL | LETHARGIC | AGITATED | MIXED
  visible_symptoms      text,
  sick_count            int         NOT NULL DEFAULT 0,
  injured_count         int         NOT NULL DEFAULT 0,
  dead_count            int         NOT NULL DEFAULT 0,
  missing_count         int         NOT NULL DEFAULT 0,
  isolation_actions     text,
  pen_incidents         text,
  biosecurity_incidents text,
  verified_by_id        text,
  verified_by_name      text,
  verified_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Treatment Records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id              uuid        NOT NULL REFERENCES quarantine_batches(id),
  facility_id           uuid        NOT NULL,
  animal_id             text,           -- null = whole batch
  tag_number            text,
  treatment_type        text        NOT NULL, -- MEDICINE | VACCINE
  medicine_name         text        NOT NULL,
  dose                  text,
  administration_route  text,       -- ORAL | INJECTION_IM | INJECTION_SC | TOPICAL | OTHER
  date_administered     date        NOT NULL DEFAULT CURRENT_DATE,
  batch_lot_number      text,
  treating_vet_id       text        NOT NULL,
  treating_vet_name     text        NOT NULL,
  next_dose_date        date,
  withdrawal_period_days int,
  withdrawal_end_date   date,
  treatment_outcome     text        NOT NULL DEFAULT 'PENDING',
  -- PENDING | IMPROVING | RECOVERED | DETERIORATING | NO_CHANGE
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Quarantine Clearances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quarantine_clearances (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clearance_code        text        NOT NULL UNIQUE,
  batch_id              uuid        NOT NULL REFERENCES quarantine_batches(id),
  facility_id           uuid        NOT NULL,
  decision              text        NOT NULL,
  -- CLEAR_FOR_EXPORT | CLEAR_FOR_SLAUGHTER | CLEAR_FOR_RETURN | EXTEND | RETEST | TREAT | PROHIBIT
  decision_date         date        NOT NULL DEFAULT CURRENT_DATE,
  decided_by_id         text        NOT NULL,
  decided_by_name       text        NOT NULL,
  checklist             jsonb       DEFAULT '{}',
  -- {period_complete, all_accounted, inspections_done, lab_accepted, vaccinations_done, no_health_incident, no_restriction, no_withdrawal}
  certificate_number    text,
  valid_until           date,
  extension_days        int,        -- for EXTEND decision
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Slaughter Records
-- One record per animal slaughtered
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slaughter_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_code        text        NOT NULL UNIQUE,
  facility_id           uuid        NOT NULL REFERENCES facilities(id),
  facility_code         text        NOT NULL,
  movement_permit_id    uuid,       -- references movement_permits(id) in the movement module
  session_date          date        NOT NULL DEFAULT CURRENT_DATE,
  animal_id             text,
  tag_number            text        NOT NULL,
  species               text        NOT NULL,
  origin_facility_code  text,
  owner_name            text,
  pen_assignment        text,
  arrival_condition     text        NOT NULL DEFAULT 'HEALTHY',
  -- Status through workflow
  status                text        NOT NULL DEFAULT 'RECEIVED',
  -- RECEIVED | ANTE_PENDING | ANTE_CLEARED | HALAL_PENDING | HALAL_CLEARED
  -- | SLAUGHTERED | POST_PENDING | POST_COMPLETE | CONDEMNED | DISPATCHED
  slaughter_date        date,
  slaughter_time        text,
  slaughter_line        text,
  carcass_code          text        UNIQUE,  -- generated after slaughter
  weight_before_kg      numeric(8,2),
  carcass_weight_kg     numeric(8,2),
  received_by_id        text,
  received_by_name      text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Ante-mortem Inspections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ante_mortem_inspections (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_id      uuid        NOT NULL REFERENCES slaughter_records(id),
  facility_id       uuid        NOT NULL,
  tag_number        text        NOT NULL,
  inspection_date   date        NOT NULL DEFAULT CURRENT_DATE,
  inspector_id      text        NOT NULL,
  inspector_name    text        NOT NULL,
  health_condition  text,       -- GOOD | FAIR | POOR | CRITICAL
  behaviour         text,       -- NORMAL | LETHARGIC | AGITATED
  mobility          text,       -- NORMAL | IMPAIRED | UNABLE
  injuries          text,
  visible_symptoms  text,
  testing_required  boolean     NOT NULL DEFAULT false,
  isolation_required boolean    NOT NULL DEFAULT false,
  decision          text        NOT NULL,
  -- FIT | CONDITIONALLY_FIT | DETAINED | REFERRED_FOR_TESTING | UNFIT | EMERGENCY
  conditions        text,       -- for CONDITIONALLY_FIT
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Halal Verifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS halal_verifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_id          uuid        NOT NULL REFERENCES slaughter_records(id),
  facility_id           uuid        NOT NULL,
  tag_number            text        NOT NULL,
  verification_date     date        NOT NULL DEFAULT CURRENT_DATE,
  slaughter_time        text,
  verified_by_id        text        NOT NULL,
  verified_by_name      text        NOT NULL,
  slaughterer_name      text,
  slaughterer_verified  boolean     NOT NULL DEFAULT false,
  animal_alive_confirmed boolean    NOT NULL DEFAULT false,
  slaughter_method      text,       -- HAND_SLAUGHTER | MECHANICAL
  stunning_used         boolean     NOT NULL DEFAULT false,
  stunning_method       text,
  equipment_condition   text,       -- GOOD | ACCEPTABLE | POOR
  tasmiyah_recited      boolean     NOT NULL DEFAULT false,
  non_compliance_notes  text,
  checklist_data        jsonb       DEFAULT '{}',
  decision              text        NOT NULL DEFAULT 'PENDING',
  -- PENDING | ACCEPTED | REJECTED
  rejection_reason      text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Post-mortem Inspections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_mortem_inspections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_id          uuid        NOT NULL REFERENCES slaughter_records(id),
  facility_id           uuid        NOT NULL,
  carcass_code          text        NOT NULL,
  inspection_date       date        NOT NULL DEFAULT CURRENT_DATE,
  inspector_id          text        NOT NULL,
  inspector_name        text        NOT NULL,
  carcass_condition     text,
  head_findings         text,
  organ_findings        text,
  visible_lesions       text,
  contamination         text,
  suspected_disease     text,
  samples_collected     boolean     NOT NULL DEFAULT false,
  sample_details        text,
  decision              text        NOT NULL,
  -- PASSED | PASSED_WITH_CONDITIONS | PARTIAL_CONDEMNATION | FULL_CONDEMNATION | DETAINED
  conditions_notes      text,
  condemnation_reason   text,
  condemned_parts       text,
  condemned_weight_kg   numeric(8,2),
  disposal_method       text,       -- INCINERATION | BURIAL | RENDERING | OTHER
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Export Consignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS export_consignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_code  text        NOT NULL UNIQUE,
  facility_id       uuid        NOT NULL REFERENCES facilities(id),
  facility_code     text        NOT NULL,
  status            text        NOT NULL DEFAULT 'PREPARING',
  -- PREPARING | READY | DISPATCHED | CANCELLED
  destination       text,
  exporter_name     text,
  container_vehicle text,
  container_seal    text,
  loading_date      date,
  loading_time      text,
  total_items       int         NOT NULL DEFAULT 0,
  total_weight_kg   numeric(10,2),
  supervisor_id     text,
  supervisor_name   text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Consignment Items (carcasses in an export consignment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consignment_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_id      uuid        NOT NULL REFERENCES export_consignments(id) ON DELETE CASCADE,
  facility_id         uuid,
  slaughter_id        uuid        NOT NULL REFERENCES slaughter_records(id),
  carcass_code        text        NOT NULL,
  tag_number          text,
  species             text,
  product_description text,
  carcass_weight_kg   numeric(8,2),
  added_at            timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_qb_facility      ON quarantine_batches(facility_id);
CREATE INDEX IF NOT EXISTS idx_qb_status        ON quarantine_batches(status);

CREATE INDEX IF NOT EXISTS idx_qba_batch        ON quarantine_batch_animals(batch_id);
CREATE INDEX IF NOT EXISTS idx_qba_status       ON quarantine_batch_animals(status);

CREATE INDEX IF NOT EXISTS idx_hi_batch         ON health_inspections(batch_id);
CREATE INDEX IF NOT EXISTS idx_hi_type          ON health_inspections(inspection_type);

CREATE INDEX IF NOT EXISTS idx_ls_batch         ON lab_samples(batch_id);
CREATE INDEX IF NOT EXISTS idx_ls_result        ON lab_samples(result);

CREATE INDEX IF NOT EXISTS idx_dm_batch         ON daily_monitoring_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_dm_date          ON daily_monitoring_records(monitoring_date);

CREATE INDEX IF NOT EXISTS idx_tr_batch         ON treatment_records(batch_id);

CREATE INDEX IF NOT EXISTS idx_qc_batch         ON quarantine_clearances(batch_id);

CREATE INDEX IF NOT EXISTS idx_sr_facility      ON slaughter_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_sr_status        ON slaughter_records(status);
CREATE INDEX IF NOT EXISTS idx_sr_date          ON slaughter_records(session_date);

CREATE INDEX IF NOT EXISTS idx_ami_slaughter    ON ante_mortem_inspections(slaughter_id);
CREATE INDEX IF NOT EXISTS idx_hv_slaughter     ON halal_verifications(slaughter_id);
CREATE INDEX IF NOT EXISTS idx_pmi_slaughter    ON post_mortem_inspections(slaughter_id);

CREATE INDEX IF NOT EXISTS idx_ec_facility      ON export_consignments(facility_id);
CREATE INDEX IF NOT EXISTS idx_ec_status        ON export_consignments(status);
CREATE INDEX IF NOT EXISTS idx_ci_consignment   ON consignment_items(consignment_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE quarantine_batches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_batch_animals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_inspections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_samples                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_monitoring_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_clearances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE slaughter_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ante_mortem_inspections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE halal_verifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_mortem_inspections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_consignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_items           ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS qb_select      ON quarantine_batches;
DROP POLICY IF EXISTS qb_insert      ON quarantine_batches;
DROP POLICY IF EXISTS qb_update      ON quarantine_batches;
DROP POLICY IF EXISTS qba_select     ON quarantine_batch_animals;
DROP POLICY IF EXISTS qba_insert     ON quarantine_batch_animals;
DROP POLICY IF EXISTS qba_update     ON quarantine_batch_animals;
DROP POLICY IF EXISTS hi_select      ON health_inspections;
DROP POLICY IF EXISTS hi_insert      ON health_inspections;
DROP POLICY IF EXISTS hi_update      ON health_inspections;
DROP POLICY IF EXISTS ls_select      ON lab_samples;
DROP POLICY IF EXISTS ls_insert      ON lab_samples;
DROP POLICY IF EXISTS ls_update      ON lab_samples;
DROP POLICY IF EXISTS dm_select      ON daily_monitoring_records;
DROP POLICY IF EXISTS dm_insert      ON daily_monitoring_records;
DROP POLICY IF EXISTS dm_update      ON daily_monitoring_records;
DROP POLICY IF EXISTS tr_select      ON treatment_records;
DROP POLICY IF EXISTS tr_insert      ON treatment_records;
DROP POLICY IF EXISTS qc_select      ON quarantine_clearances;
DROP POLICY IF EXISTS qc_insert      ON quarantine_clearances;
DROP POLICY IF EXISTS sr_select      ON slaughter_records;
DROP POLICY IF EXISTS sr_insert      ON slaughter_records;
DROP POLICY IF EXISTS sr_update      ON slaughter_records;
DROP POLICY IF EXISTS ami_select     ON ante_mortem_inspections;
DROP POLICY IF EXISTS ami_insert     ON ante_mortem_inspections;
DROP POLICY IF EXISTS hv_select      ON halal_verifications;
DROP POLICY IF EXISTS hv_insert      ON halal_verifications;
DROP POLICY IF EXISTS hv_update      ON halal_verifications;
DROP POLICY IF EXISTS pmi_select     ON post_mortem_inspections;
DROP POLICY IF EXISTS pmi_insert     ON post_mortem_inspections;
DROP POLICY IF EXISTS ec_select      ON export_consignments;
DROP POLICY IF EXISTS ec_insert      ON export_consignments;
DROP POLICY IF EXISTS ec_update      ON export_consignments;
DROP POLICY IF EXISTS ci_select      ON consignment_items;
DROP POLICY IF EXISTS ci_insert      ON consignment_items;
DROP POLICY IF EXISTS ci_delete      ON consignment_items;

-- All authenticated users can read and write
CREATE POLICY qb_select   ON quarantine_batches         FOR SELECT TO authenticated USING (true);
CREATE POLICY qb_insert   ON quarantine_batches         FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY qb_update   ON quarantine_batches         FOR UPDATE TO authenticated USING (true);
CREATE POLICY qba_select  ON quarantine_batch_animals   FOR SELECT TO authenticated USING (true);
CREATE POLICY qba_insert  ON quarantine_batch_animals   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY qba_update  ON quarantine_batch_animals   FOR UPDATE TO authenticated USING (true);
CREATE POLICY hi_select   ON health_inspections         FOR SELECT TO authenticated USING (true);
CREATE POLICY hi_insert   ON health_inspections         FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY hi_update   ON health_inspections         FOR UPDATE TO authenticated USING (true);
CREATE POLICY ls_select   ON lab_samples                FOR SELECT TO authenticated USING (true);
CREATE POLICY ls_insert   ON lab_samples                FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ls_update   ON lab_samples                FOR UPDATE TO authenticated USING (true);
CREATE POLICY dm_select   ON daily_monitoring_records   FOR SELECT TO authenticated USING (true);
CREATE POLICY dm_insert   ON daily_monitoring_records   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY dm_update   ON daily_monitoring_records   FOR UPDATE TO authenticated USING (true);
CREATE POLICY tr_select   ON treatment_records          FOR SELECT TO authenticated USING (true);
CREATE POLICY tr_insert   ON treatment_records          FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY qc_select   ON quarantine_clearances      FOR SELECT TO authenticated USING (true);
CREATE POLICY qc_insert   ON quarantine_clearances      FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sr_select   ON slaughter_records          FOR SELECT TO authenticated USING (true);
CREATE POLICY sr_insert   ON slaughter_records          FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sr_update   ON slaughter_records          FOR UPDATE TO authenticated USING (true);
CREATE POLICY ami_select  ON ante_mortem_inspections    FOR SELECT TO authenticated USING (true);
CREATE POLICY ami_insert  ON ante_mortem_inspections    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY hv_select   ON halal_verifications        FOR SELECT TO authenticated USING (true);
CREATE POLICY hv_insert   ON halal_verifications        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY hv_update   ON halal_verifications        FOR UPDATE TO authenticated USING (true);
CREATE POLICY pmi_select  ON post_mortem_inspections    FOR SELECT TO authenticated USING (true);
CREATE POLICY pmi_insert  ON post_mortem_inspections    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ec_select   ON export_consignments        FOR SELECT TO authenticated USING (true);
CREATE POLICY ec_insert   ON export_consignments        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ec_update   ON export_consignments        FOR UPDATE TO authenticated USING (true);
CREATE POLICY ci_select   ON consignment_items          FOR SELECT TO authenticated USING (true);
CREATE POLICY ci_insert   ON consignment_items          FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ci_delete   ON consignment_items          FOR DELETE TO authenticated USING (true);
