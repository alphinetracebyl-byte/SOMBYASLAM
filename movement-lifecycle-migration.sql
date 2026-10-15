-- ─────────────────────────────────────────────────────────────────────────────
-- SOMLITS — Movement Lifecycle Steps 4-7
-- Extends farmer_movement_requests, movement_tasks
-- Creates movement_destination_checks, movement_permits
-- Creates generate_destination_check_code, generate_permit_number functions
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Migration 1: Extend farmer_movement_requests ───────────────────────────

ALTER TABLE farmer_movement_requests
  ADD COLUMN IF NOT EXISTS destination_region_code    TEXT,
  ADD COLUMN IF NOT EXISTS destination_check_code     TEXT,
  ADD COLUMN IF NOT EXISTS permit_number              TEXT,
  ADD COLUMN IF NOT EXISTS actual_departure_date      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS departure_confirmed_by_id  UUID,
  ADD COLUMN IF NOT EXISTS departure_confirmed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS actual_arrival_date        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrival_confirmed_by_id    UUID,
  ADD COLUMN IF NOT EXISTS arrival_confirmed_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS arrival_animal_count       INT,
  ADD COLUMN IF NOT EXISTS arrival_discrepancy_notes  TEXT,
  ADD COLUMN IF NOT EXISTS farmer_user_id             UUID,
  ADD COLUMN IF NOT EXISTS owner_name                 TEXT,
  ADD COLUMN IF NOT EXISTS species_notes              TEXT;

-- ── Migration 2: Extend movement_tasks ────────────────────────────────────

ALTER TABLE movement_tasks
  ADD COLUMN IF NOT EXISTS task_type       TEXT NOT NULL DEFAULT 'MOVEMENT_REVIEW',
  ADD COLUMN IF NOT EXISTS assigned_to_id  UUID,
  ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- task_type values:
--   MOVEMENT_REVIEW    — initial field officer / vet review (step 2)
--   DEPARTURE_CONFIRM  — origin inspector confirms departure (step 6)
--   ARRIVAL_CONFIRM    — destination inspector confirms arrival (step 7)
-- (Destination check uses movement_destination_checks table, not movement_tasks)

-- ── Migration 3: movement_destination_checks ──────────────────────────────

CREATE TABLE IF NOT EXISTS movement_destination_checks (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  check_code                  TEXT        NOT NULL UNIQUE,
  movement_code               TEXT        NOT NULL,
  inspection_code             TEXT,

  -- Assignment
  assigned_by_id              UUID,
  assigned_by_name            TEXT,
  assigned_to_id              UUID,
  assigned_to_name            TEXT,
  assigned_to_role            TEXT,
  assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Destination snapshot
  destination_premises_code   TEXT,
  destination_premises_name   TEXT,
  destination_region_code     TEXT,
  origin_premises_code        TEXT,
  origin_premises_name        TEXT,
  origin_region_code          TEXT,
  animal_count                INT,
  movement_type_code          TEXT,
  purpose                     TEXT,

  -- Check results (set by destination inspector)
  premises_status             TEXT,         -- ACTIVE | SUSPENDED | NOT_FOUND
  premises_capacity_ok        BOOLEAN,
  capacity_notes              TEXT,
  restriction_exists          BOOLEAN,
  restriction_details         TEXT,
  destination_officer_notes   TEXT,

  -- Decision
  decision                    TEXT,         -- APPROVED | REJECTED
  decided_at                  TIMESTAMPTZ,

  -- Workflow
  status                      TEXT        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN (
                                'PENDING','IN_PROGRESS','SUBMITTED',
                                'APPROVED','REJECTED')),
  started_at                  TIMESTAMPTZ,
  submitted_at                TIMESTAMPTZ,

  region_code                 TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdc_movement_code   ON movement_destination_checks (movement_code);
CREATE INDEX IF NOT EXISTS idx_mdc_officer         ON movement_destination_checks (assigned_to_id, status);
CREATE INDEX IF NOT EXISTS idx_mdc_region          ON movement_destination_checks (region_code, status);

ALTER TABLE movement_destination_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_destination_checks' AND policyname='mdc_select') THEN
    CREATE POLICY mdc_select ON movement_destination_checks FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_destination_checks' AND policyname='mdc_insert') THEN
    CREATE POLICY mdc_insert ON movement_destination_checks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_destination_checks' AND policyname='mdc_update') THEN
    CREATE POLICY mdc_update ON movement_destination_checks FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ── Migration 4: movement_permits ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS movement_permits (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_number         TEXT        NOT NULL UNIQUE,
  movement_code         TEXT        NOT NULL,
  inspection_code       TEXT,
  destination_check_code TEXT,

  -- Permit details
  valid_from            DATE,
  valid_to              DATE,
  conditions            TEXT,
  animal_count          INT,
  animal_ids            JSONB,

  -- Origin/destination snapshot
  origin_premises_code  TEXT,
  origin_premises_name  TEXT,
  origin_region_code    TEXT,
  destination_premises_code TEXT,
  destination_premises_name TEXT,
  destination_region_code TEXT,
  owner_name            TEXT,
  movement_type_code    TEXT,
  purpose               TEXT,
  vehicle_registration  TEXT,

  -- Issuing
  issued_by_id          UUID,
  issued_by_name        TEXT,
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Status
  status                TEXT        NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','USED')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_movement_code ON movement_permits (movement_code);
CREATE INDEX IF NOT EXISTS idx_mp_permit_number ON movement_permits (permit_number);

ALTER TABLE movement_permits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_permits' AND policyname='mp_select') THEN
    CREATE POLICY mp_select ON movement_permits FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_permits' AND policyname='mp_insert') THEN
    CREATE POLICY mp_insert ON movement_permits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_permits' AND policyname='mp_update') THEN
    CREATE POLICY mp_update ON movement_permits FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ── Migration 5: Helper functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_destination_check_code(p_region TEXT DEFAULT 'SOM')
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YY');
  v_reg  TEXT := UPPER(LEFT(COALESCE(NULLIF(TRIM(p_region), ''), 'SOM'), 3));
  v_seq  INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(check_code, '-', 4) AS INT)), 0) + 1
    INTO v_seq
    FROM movement_destination_checks
   WHERE check_code LIKE 'DST-' || v_reg || '-' || v_year || '-%';
  RETURN 'DST-' || v_reg || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_permit_number(p_region TEXT DEFAULT 'SOM')
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_reg  TEXT := UPPER(LEFT(COALESCE(NULLIF(TRIM(p_region), ''), 'SOM'), 3));
  v_seq  INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(permit_number, '-', 4) AS INT)), 0) + 1
    INTO v_seq
    FROM movement_permits
   WHERE permit_number LIKE 'PRM-' || v_reg || '-' || v_year || '-%';
  RETURN 'PRM-' || v_reg || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

COMMIT;
