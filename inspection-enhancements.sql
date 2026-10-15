-- ─────────────────────────────────────────────────────────────────────────────
-- SOMLITS — Inspection Enhancements (International Standards Alignment)
-- Adds: BCS score, locomotion score, species match, per-disease checklist,
--       per-disease vaccination records, vehicle biosecurity inspection,
--       vet licence on permit.
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── movement_inspection_animals: new per-animal fields ──────────────────────

ALTER TABLE movement_inspection_animals
  ADD COLUMN IF NOT EXISTS species_match        BOOLEAN,
  ADD COLUMN IF NOT EXISTS bcs_score            SMALLINT CHECK (bcs_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS locomotion_score     SMALLINT CHECK (locomotion_score BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS disease_checks       JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vaccination_records  JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN movement_inspection_animals.bcs_score IS
  'FAO Body Condition Score 1 (emaciated) – 5 (very fat). BCS < 3 = unfit for transport.';
COMMENT ON COLUMN movement_inspection_animals.locomotion_score IS
  'Sprecher locomotion score 0 (normal) – 3 (severely lame). Score 3 = unfit for transport.';
COMMENT ON COLUMN movement_inspection_animals.disease_checks IS
  'JSONB map: disease_key → "No signs" | "Suspected" | "Not applicable". '
  'Keys: FMD, CBPP, CCPP, LSD, RVF, BRUCELLOSIS, ANTHRAX, MANGE, ORF.';
COMMENT ON COLUMN movement_inspection_animals.vaccination_records IS
  'JSONB array of {disease, vaccinated, date, product, batch, nextDue}.';

-- ── movement_inspections: vehicle biosecurity section ───────────────────────

ALTER TABLE movement_inspections
  ADD COLUMN IF NOT EXISTS vehicle_inspection JSONB;

COMMENT ON COLUMN movement_inspections.vehicle_inspection IS
  'JSONB: vehicleType, cleanliness, previousLoad, disinfectionApplied, '
  'disinfectant, ventilationAdequate, loadingDensityOk, waterProvided, '
  'feedProvided, journeyHours, notes.';

-- ── movement_permits: official veterinarian licence number ──────────────────

ALTER TABLE movement_permits
  ADD COLUMN IF NOT EXISTS issued_by_licence TEXT,
  ADD COLUMN IF NOT EXISTS permit_type       TEXT,
  ADD COLUMN IF NOT EXISTS species_summary   TEXT,
  ADD COLUMN IF NOT EXISTS owner_national_id TEXT,
  ADD COLUMN IF NOT EXISTS transporter_name  TEXT,
  ADD COLUMN IF NOT EXISTS sex_breakdown     TEXT;

-- ── Anon RLS policies (SOMADMIN dev login → anon role) ──────────────────────

-- movement_inspections
DROP POLICY IF EXISTS mi_anon_sel ON movement_inspections;
DROP POLICY IF EXISTS mi_anon_ins ON movement_inspections;
DROP POLICY IF EXISTS mi_anon_upd ON movement_inspections;
CREATE POLICY mi_anon_sel ON movement_inspections FOR SELECT TO anon USING (true);
CREATE POLICY mi_anon_ins ON movement_inspections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY mi_anon_upd ON movement_inspections FOR UPDATE TO anon USING (true);

-- movement_inspection_animals
DROP POLICY IF EXISTS mia_anon_sel ON movement_inspection_animals;
DROP POLICY IF EXISTS mia_anon_ins ON movement_inspection_animals;
DROP POLICY IF EXISTS mia_anon_upd ON movement_inspection_animals;
DROP POLICY IF EXISTS mia_anon_del ON movement_inspection_animals;
CREATE POLICY mia_anon_sel ON movement_inspection_animals FOR SELECT TO anon USING (true);
CREATE POLICY mia_anon_ins ON movement_inspection_animals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY mia_anon_upd ON movement_inspection_animals FOR UPDATE TO anon USING (true);
CREATE POLICY mia_anon_del ON movement_inspection_animals FOR DELETE TO anon USING (true);

-- movement_destination_checks
DROP POLICY IF EXISTS mdc_anon_sel ON movement_destination_checks;
DROP POLICY IF EXISTS mdc_anon_ins ON movement_destination_checks;
DROP POLICY IF EXISTS mdc_anon_upd ON movement_destination_checks;
CREATE POLICY mdc_anon_sel ON movement_destination_checks FOR SELECT TO anon USING (true);
CREATE POLICY mdc_anon_ins ON movement_destination_checks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY mdc_anon_upd ON movement_destination_checks FOR UPDATE TO anon USING (true);

-- movement_permits
DROP POLICY IF EXISTS mp_anon_sel ON movement_permits;
DROP POLICY IF EXISTS mp_anon_ins ON movement_permits;
DROP POLICY IF EXISTS mp_anon_upd ON movement_permits;
CREATE POLICY mp_anon_sel ON movement_permits FOR SELECT TO anon USING (true);
CREATE POLICY mp_anon_ins ON movement_permits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY mp_anon_upd ON movement_permits FOR UPDATE TO anon USING (true);

-- farmer_movement_requests (anon update for status changes from field portal)
DROP POLICY IF EXISTS fmr_anon_sel ON farmer_movement_requests;
DROP POLICY IF EXISTS fmr_anon_upd ON farmer_movement_requests;
CREATE POLICY fmr_anon_sel ON farmer_movement_requests FOR SELECT TO anon USING (true);
CREATE POLICY fmr_anon_upd ON farmer_movement_requests FOR UPDATE TO anon USING (true);

-- movement_tasks
DROP POLICY IF EXISTS mtask_anon_sel ON movement_tasks;
DROP POLICY IF EXISTS mtask_anon_upd ON movement_tasks;
CREATE POLICY mtask_anon_sel ON movement_tasks FOR SELECT TO anon USING (true);
CREATE POLICY mtask_anon_upd ON movement_tasks FOR UPDATE TO anon USING (true);

COMMIT;
