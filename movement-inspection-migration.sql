-- ─────────────────────────────────────────────────────────────────────────────
-- Pre-Movement Animal Inspection Module
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Main inspection record ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movement_inspections (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_code           TEXT NOT NULL UNIQUE,
  movement_code             TEXT NOT NULL,

  -- Assignment
  assigned_by_id            UUID,
  assigned_by_name          TEXT,
  assigned_to_id            UUID,
  assigned_to_name          TEXT,
  assigned_to_role          TEXT,
  assigned_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  required_completion_date  DATE,

  -- Denormalised movement snapshot (supports offline use)
  origin_premises_code      TEXT,
  origin_premises_name      TEXT,
  origin_region_code        TEXT,
  destination_premises_code TEXT,
  destination_premises_name TEXT,
  farmer_user_id            UUID,
  owner_name                TEXT,
  animal_count              INT NOT NULL DEFAULT 0,
  animal_ids                JSONB,
  species_summary           TEXT,
  movement_type_code        TEXT,
  purpose                   TEXT,
  planned_departure_date    DATE,

  -- Arrival
  arrived_at                TIMESTAMPTZ,
  officer_gps_lat           NUMERIC(10, 6),
  officer_gps_lng           NUMERIC(10, 6),
  gps_warning               BOOLEAN NOT NULL DEFAULT FALSE,

  -- Workflow status
  status                    TEXT NOT NULL DEFAULT 'ASSIGNED'
                            CHECK (status IN (
                              'ASSIGNED','IN_PROGRESS','SUBMITTED',
                              'APPROVED','PARTIAL_PASS','CORRECTION_REQUIRED',
                              'REINSPECTION_REQUIRED','VETERINARY_REVIEW',
                              'FAILED','DISEASE_SUSPECTED')),
  started_at                TIMESTAMPTZ,
  submitted_at              TIMESTAMPTZ,

  -- Overall decision & summary
  overall_decision          TEXT,
  officer_declaration       BOOLEAN NOT NULL DEFAULT FALSE,
  overall_notes             TEXT,
  health_observations       TEXT,

  -- Counts (computed on submit)
  requested_count           INT NOT NULL DEFAULT 0,
  scanned_count             INT NOT NULL DEFAULT 0,
  passed_count              INT NOT NULL DEFAULT 0,
  failed_count              INT NOT NULL DEFAULT 0,
  excluded_count            INT NOT NULL DEFAULT 0,
  missing_count             INT NOT NULL DEFAULT 0,

  region_code               TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Per-animal inspection records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movement_inspection_animals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id         UUID NOT NULL REFERENCES movement_inspections(id) ON DELETE CASCADE,

  -- Animal identity
  animal_id             UUID,
  tag_serial            TEXT,
  animal_code           TEXT,
  species               TEXT,
  breed                 TEXT,
  sex                   TEXT,

  -- Tag scan
  scan_method           TEXT DEFAULT 'MANUAL' CHECK (scan_method IN ('RFID','MANUAL')),
  scanned_at            TIMESTAMPTZ,

  -- Tag verification checks (each is a boolean result)
  tag_found             BOOLEAN,
  tag_active            BOOLEAN,
  owner_match           BOOLEAN,
  premises_match        BOOLEAN,
  in_request            BOOLEAN,
  not_restricted        BOOLEAN,
  tag_exception         TEXT CHECK (tag_exception IN (
                          'TAG_MISSING','TAG_DAMAGED','TAG_UNREADABLE',
                          'NUMBER_MISMATCH','ANIMAL_NOT_FOUND','ADDITIONAL_ANIMAL',
                          'SUSPECTED_TAMPERING')),
  tag_exception_notes   TEXT,

  -- Health checks stored as JSONB: { "GENERAL_APPEARANCE": "Normal", "BEHAVIOUR": "Normal", … }
  health_checks         JSONB NOT NULL DEFAULT '{}',
  clinical_notes        TEXT,
  body_temp_celsius     NUMERIC(4, 1),
  marked_for_isolation  BOOLEAN NOT NULL DEFAULT FALSE,
  referred_to_vet       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Vaccination compliance
  vaccination_compliant BOOLEAN,
  vaccination_notes     TEXT,

  -- Individual fitness result
  animal_result         TEXT CHECK (animal_result IN (
                          'FIT_FOR_MOVEMENT','CONDITIONALLY_FIT','UNFIT_FOR_MOVEMENT',
                          'UNDER_OBSERVATION','REFERRED_TO_VET','NOT_PRESENTED',
                          'IDENTIFICATION_MISMATCH','EXCLUDED')),
  result_conditions     TEXT,

  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mi_movement_code  ON movement_inspections (movement_code);
CREATE INDEX IF NOT EXISTS idx_mi_officer        ON movement_inspections (assigned_to_id, status);
CREATE INDEX IF NOT EXISTS idx_mi_region         ON movement_inspections (region_code, status);
CREATE INDEX IF NOT EXISTS idx_mia_inspection    ON movement_inspection_animals (inspection_id);
CREATE INDEX IF NOT EXISTS idx_mia_animal        ON movement_inspection_animals (animal_id);

-- ── Row-level security ───────────────────────────────────────────────────────
ALTER TABLE movement_inspections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_inspection_animals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_inspections' AND policyname='mi_select') THEN
    CREATE POLICY mi_select ON movement_inspections FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_inspections' AND policyname='mi_insert') THEN
    CREATE POLICY mi_insert ON movement_inspections FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_inspections' AND policyname='mi_update') THEN
    CREATE POLICY mi_update ON movement_inspections FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_inspection_animals' AND policyname='mia_select') THEN
    CREATE POLICY mia_select ON movement_inspection_animals FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_inspection_animals' AND policyname='mia_insert') THEN
    CREATE POLICY mia_insert ON movement_inspection_animals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_inspection_animals' AND policyname='mia_update') THEN
    CREATE POLICY mia_update ON movement_inspection_animals FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ── Inspection code generator ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_inspection_code(p_region TEXT DEFAULT 'SOM')
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YY');
  v_reg  TEXT := UPPER(LEFT(COALESCE(NULLIF(TRIM(p_region), ''), 'SOM'), 3));
  v_seq  INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(inspection_code, '-', 4) AS INT)), 0) + 1
    INTO v_seq
    FROM movement_inspections
   WHERE inspection_code LIKE 'INS-' || v_reg || '-' || v_year || '-%';
  RETURN 'INS-' || v_reg || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

COMMIT;
