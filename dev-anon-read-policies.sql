-- dev-anon-read-policies.sql
-- Run this once in Supabase SQL editor.
-- Allows the anon role to SELECT and UPDATE key tables so the SOMADMIN
-- dev login works even when anonymous auth is not enabled in the project.

-- Facilities (read + write)
DROP POLICY IF EXISTS facilities_select_anon ON facilities;
CREATE POLICY facilities_select_anon ON facilities
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS facilities_update_anon ON facilities;
CREATE POLICY facilities_update_anon ON facilities
  FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS fstaff_select_anon ON facility_staff;
CREATE POLICY fstaff_select_anon ON facility_staff
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS fstaff_update_anon ON facility_staff;
CREATE POLICY fstaff_update_anon ON facility_staff
  FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS facdocs_select_anon ON facility_documents;
CREATE POLICY facdocs_select_anon ON facility_documents
  FOR SELECT TO anon USING (true);

-- User registrations (read + write for ministry user management)
DROP POLICY IF EXISTS user_reg_select_anon ON user_registrations;
CREATE POLICY user_reg_select_anon ON user_registrations
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS user_reg_update_anon ON user_registrations;
CREATE POLICY user_reg_update_anon ON user_registrations
  FOR UPDATE TO anon USING (true);

-- Animals (read — needed by field checkpoint scanner)
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS animals_select_anon ON animals;
CREATE POLICY animals_select_anon ON animals
  FOR SELECT TO anon USING (true);

-- Farmer premises (read — needed by field checkpoint scanner)
DROP POLICY IF EXISTS farmer_premises_select_anon ON farmer_premises;
CREATE POLICY farmer_premises_select_anon ON farmer_premises
  FOR SELECT TO anon USING (true);

-- Farmer movement requests (read — needed by field checkpoint scanner)
DROP POLICY IF EXISTS farmer_mr_select_anon ON farmer_movement_requests;
CREATE POLICY farmer_mr_select_anon ON farmer_movement_requests
  FOR SELECT TO anon USING (true);

-- Farmers (read + write)
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS farmers_select_anon ON farmers;
CREATE POLICY farmers_select_anon ON farmers
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS farmers_update_anon ON farmers;
CREATE POLICY farmers_update_anon ON farmers
  FOR UPDATE TO anon USING (true);

-- Movement permits (read + update for quarantine arrival flow)
DROP POLICY IF EXISTS mvpermit_select_anon ON movement_permits;
CREATE POLICY mvpermit_select_anon ON movement_permits
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS mvpermit_update_anon ON movement_permits;
CREATE POLICY mvpermit_update_anon ON movement_permits
  FOR UPDATE TO anon USING (true);

-- Quarantine batches (full CRUD for anon)
DROP POLICY IF EXISTS qbatch_select_anon ON quarantine_batches;
CREATE POLICY qbatch_select_anon ON quarantine_batches
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS qbatch_insert_anon ON quarantine_batches;
CREATE POLICY qbatch_insert_anon ON quarantine_batches
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS qbatch_update_anon ON quarantine_batches;
CREATE POLICY qbatch_update_anon ON quarantine_batches
  FOR UPDATE TO anon USING (true);

-- Quarantine batch animals (full CRUD for anon)
DROP POLICY IF EXISTS qbanimal_select_anon ON quarantine_batch_animals;
CREATE POLICY qbanimal_select_anon ON quarantine_batch_animals
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS qbanimal_insert_anon ON quarantine_batch_animals;
CREATE POLICY qbanimal_insert_anon ON quarantine_batch_animals
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS qbanimal_update_anon ON quarantine_batch_animals;
CREATE POLICY qbanimal_update_anon ON quarantine_batch_animals
  FOR UPDATE TO anon USING (true);

-- Add pen columns to quarantine_batch_animals if they don't exist yet
ALTER TABLE quarantine_batch_animals ADD COLUMN IF NOT EXISTS pen_id         uuid;
ALTER TABLE quarantine_batch_animals ADD COLUMN IF NOT EXISTS pen_code       text;
ALTER TABLE quarantine_batch_animals ADD COLUMN IF NOT EXISTS exception_type text DEFAULT 'SICK';

-- Quarantine vaccinations (anon)
DROP POLICY IF EXISTS qvax_anon_sel ON quarantine_vaccinations;
DROP POLICY IF EXISTS qvax_anon_ins ON quarantine_vaccinations;
DROP POLICY IF EXISTS qvax_anon_upd ON quarantine_vaccinations;
CREATE POLICY qvax_anon_sel ON quarantine_vaccinations FOR SELECT TO anon USING (true);
CREATE POLICY qvax_anon_ins ON quarantine_vaccinations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY qvax_anon_upd ON quarantine_vaccinations FOR UPDATE TO anon USING (true);

-- Quarantine daily inspections (anon)
DROP POLICY IF EXISTS qinsp_anon_sel ON quarantine_daily_inspections;
DROP POLICY IF EXISTS qinsp_anon_ins ON quarantine_daily_inspections;
DROP POLICY IF EXISTS qinsp_anon_upd ON quarantine_daily_inspections;
CREATE POLICY qinsp_anon_sel ON quarantine_daily_inspections FOR SELECT TO anon USING (true);
CREATE POLICY qinsp_anon_ins ON quarantine_daily_inspections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY qinsp_anon_upd ON quarantine_daily_inspections FOR UPDATE TO anon USING (true);

-- Quarantine RFID records (anon)
DROP POLICY IF EXISTS qrfid_anon_sel ON quarantine_rfid_records;
DROP POLICY IF EXISTS qrfid_anon_ins ON quarantine_rfid_records;
CREATE POLICY qrfid_anon_sel ON quarantine_rfid_records FOR SELECT TO anon USING (true);
CREATE POLICY qrfid_anon_ins ON quarantine_rfid_records FOR INSERT TO anon WITH CHECK (true);

-- ── Slaughter module (full CRUD for anon / SOMADMIN dev login) ──────────────

-- Slaughter records
DROP POLICY IF EXISTS sl_anon_sel ON slaughter_records;
DROP POLICY IF EXISTS sl_anon_ins ON slaughter_records;
DROP POLICY IF EXISTS sl_anon_upd ON slaughter_records;
CREATE POLICY sl_anon_sel ON slaughter_records FOR SELECT TO anon USING (true);
CREATE POLICY sl_anon_ins ON slaughter_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY sl_anon_upd ON slaughter_records FOR UPDATE TO anon USING (true);

-- Ante-mortem inspections
DROP POLICY IF EXISTS ami_anon_sel ON ante_mortem_inspections;
DROP POLICY IF EXISTS ami_anon_ins ON ante_mortem_inspections;
CREATE POLICY ami_anon_sel ON ante_mortem_inspections FOR SELECT TO anon USING (true);
CREATE POLICY ami_anon_ins ON ante_mortem_inspections FOR INSERT TO anon WITH CHECK (true);

-- Halal verifications
DROP POLICY IF EXISTS hv_anon_sel ON halal_verifications;
DROP POLICY IF EXISTS hv_anon_ins ON halal_verifications;
CREATE POLICY hv_anon_sel ON halal_verifications FOR SELECT TO anon USING (true);
CREATE POLICY hv_anon_ins ON halal_verifications FOR INSERT TO anon WITH CHECK (true);

-- Post-mortem inspections
DROP POLICY IF EXISTS pmi_anon_sel ON post_mortem_inspections;
DROP POLICY IF EXISTS pmi_anon_ins ON post_mortem_inspections;
CREATE POLICY pmi_anon_sel ON post_mortem_inspections FOR SELECT TO anon USING (true);
CREATE POLICY pmi_anon_ins ON post_mortem_inspections FOR INSERT TO anon WITH CHECK (true);

-- Export consignments
DROP POLICY IF EXISTS cons_anon_sel ON export_consignments;
DROP POLICY IF EXISTS cons_anon_ins ON export_consignments;
DROP POLICY IF EXISTS cons_anon_upd ON export_consignments;
CREATE POLICY cons_anon_sel ON export_consignments FOR SELECT TO anon USING (true);
CREATE POLICY cons_anon_ins ON export_consignments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY cons_anon_upd ON export_consignments FOR UPDATE TO anon USING (true);

-- Consignment items
DROP POLICY IF EXISTS ci_anon_sel ON consignment_items;
DROP POLICY IF EXISTS ci_anon_ins ON consignment_items;
CREATE POLICY ci_anon_sel ON consignment_items FOR SELECT TO anon USING (true);
CREATE POLICY ci_anon_ins ON consignment_items FOR INSERT TO anon WITH CHECK (true);

-- ── Movement inspection module (anon / SOMADMIN dev login) ──────────────────

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

-- farmer_movement_requests (anon SELECT + UPDATE for status changes from field portal)
DROP POLICY IF EXISTS fmr_anon_sel ON farmer_movement_requests;
DROP POLICY IF EXISTS fmr_anon_upd ON farmer_movement_requests;
CREATE POLICY fmr_anon_sel ON farmer_movement_requests FOR SELECT TO anon USING (true);
CREATE POLICY fmr_anon_upd ON farmer_movement_requests FOR UPDATE TO anon USING (true);

-- movement_tasks
DROP POLICY IF EXISTS mtask_anon_sel ON movement_tasks;
DROP POLICY IF EXISTS mtask_anon_upd ON movement_tasks;
CREATE POLICY mtask_anon_sel ON movement_tasks FOR SELECT TO anon USING (true);
CREATE POLICY mtask_anon_upd ON movement_tasks FOR UPDATE TO anon USING (true);
