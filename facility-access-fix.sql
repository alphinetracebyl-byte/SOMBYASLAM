-- ══════════════════════════════════════════════════════════════════════════════
-- SOMLITS — Facility Tables Access Fix
-- Run in Supabase SQL Editor.
-- Ensures authenticated users can read facility_staff and facility_documents.
-- Safe to run multiple times.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add temp_password column if it was missing from the original schema ────
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS temp_password text;

-- ── 2. Ensure RLS is ON for all facility tables ───────────────────────────────
ALTER TABLE facilities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_staff_documents ENABLE ROW LEVEL SECURITY;

-- ── 3. Re-create read policies for authenticated users ────────────────────────
DROP POLICY IF EXISTS facilities_select  ON facilities;
DROP POLICY IF EXISTS fstaff_select      ON facility_staff;
DROP POLICY IF EXISTS facdocs_select     ON facility_documents;
DROP POLICY IF EXISTS staffdocs_select   ON facility_staff_documents;

CREATE POLICY facilities_select  ON facilities               FOR SELECT TO authenticated USING (true);
CREATE POLICY fstaff_select      ON facility_staff           FOR SELECT TO authenticated USING (true);
CREATE POLICY facdocs_select     ON facility_documents       FOR SELECT TO authenticated USING (true);
CREATE POLICY staffdocs_select   ON facility_staff_documents FOR SELECT TO authenticated USING (true);

-- ── 4. Re-create write policies for authenticated users ───────────────────────
DROP POLICY IF EXISTS facilities_insert ON facilities;
DROP POLICY IF EXISTS facilities_update ON facilities;
DROP POLICY IF EXISTS fstaff_insert     ON facility_staff;
DROP POLICY IF EXISTS fstaff_update     ON facility_staff;
DROP POLICY IF EXISTS facdocs_insert    ON facility_documents;
DROP POLICY IF EXISTS staffdocs_insert  ON facility_staff_documents;

CREATE POLICY facilities_insert ON facilities               FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY facilities_update ON facilities               FOR UPDATE TO authenticated USING (true);
CREATE POLICY fstaff_insert     ON facility_staff           FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fstaff_update     ON facility_staff           FOR UPDATE TO authenticated USING (true);
CREATE POLICY facdocs_insert    ON facility_documents       FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY staffdocs_insert  ON facility_staff_documents FOR INSERT TO authenticated WITH CHECK (true);

-- ── 5. Anon INSERT policies — allows self-registration from the export portal ──
-- supabase.auth.signUp() does not immediately establish a session (email
-- confirmation is required), so all inserts during self-registration run as
-- anon. We allow inserts into all four facility tables for anon users so
-- the full registration payload is saved for Ministry review.
DROP POLICY IF EXISTS facilities_insert_anon    ON facilities;
DROP POLICY IF EXISTS fstaff_insert_anon        ON facility_staff;
DROP POLICY IF EXISTS facdocs_insert_anon       ON facility_documents;
DROP POLICY IF EXISTS staffdocs_insert_anon     ON facility_staff_documents;

CREATE POLICY facilities_insert_anon ON facilities
  FOR INSERT TO anon
  WITH CHECK (status = 'PENDING');

CREATE POLICY fstaff_insert_anon ON facility_staff
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY facdocs_insert_anon ON facility_documents
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY staffdocs_insert_anon ON facility_staff_documents
  FOR INSERT TO anon
  WITH CHECK (true);

-- ── 6. Quick check — shows staff count per facility ───────────────────────────
-- (remove this if you don't want the output)
SELECT f.facility_code, f.facility_name, COUNT(fs.id) AS staff_count
FROM facilities f
LEFT JOIN facility_staff fs ON fs.facility_id = f.id AND fs.status != 'INACTIVE'
GROUP BY f.facility_code, f.facility_name
ORDER BY f.facility_code;
