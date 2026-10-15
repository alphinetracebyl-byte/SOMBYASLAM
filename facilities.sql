-- =============================================================================
-- SOMLITS Facilities Schema
-- Tables: facilities, facility_staff, facility_documents, facility_staff_documents
-- =============================================================================

-- -------------------------------------------------------------------------
-- Facilities
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facilities (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_code       text        NOT NULL UNIQUE,
  facility_name       text        NOT NULL,
  facility_type       text        NOT NULL,
  -- Values: QUARANTINE_STATION | SLAUGHTERHOUSE | CHECKPOINT
  checkpoint_type     text,
  -- Values: BORDER | INTERNAL | PORT  (only for CHECKPOINT)
  status              text        NOT NULL DEFAULT 'ACTIVE',
  -- Values: ACTIVE | INACTIVE | SUSPENDED
  region_code         text        NOT NULL,
  district_code       text,
  location_address    text,
  latitude            numeric(9,6),
  longitude           numeric(9,6),
  capacity            int,
  -- QUARANTINE_STATION: animal holding capacity; SLAUGHTERHOUSE: daily slaughter capacity
  species_handled     text[],
  -- Values: CATTLE | CAMEL | GOAT | SHEEP
  license_number      text,
  license_expiry_date date,
  issuing_authority   text,
  accreditation_body  text,
  contact_name        text,
  contact_phone       text,
  notes               text,
  registered_by_id    text,
  registered_by_name  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Add any columns that may be missing from an earlier version of this table
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS checkpoint_type     text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS district_code       text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS location_address    text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS latitude            numeric(9,6);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS longitude           numeric(9,6);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS capacity            int;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS species_handled     text[];
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS license_number      text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS license_expiry_date date;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS issuing_authority   text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS accreditation_body  text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS contact_name        text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS contact_phone       text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS notes               text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS registered_by_id             text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS registered_by_name            text;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS updated_at                    timestamptz DEFAULT now();
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS quarantine_types_supported    text[];
-- Values: EXPORT | IMPORT | DISEASE_CONTROL | ROUTINE

-- -------------------------------------------------------------------------
-- Facility Staff
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facility_staff (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id          uuid        NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  facility_code        text        NOT NULL,
  staff_name           text        NOT NULL,
  staff_role           text        NOT NULL,
  -- QUARANTINE_STATION roles: QUARANTINE_SUPERVISOR | VETERINARY_OFFICER | LAB_TECHNICIAN
  -- SLAUGHTERHOUSE roles:     SLAUGHTER_SUPERVISOR | HALAL_SUPERVISOR | MEAT_INSPECTOR
  -- CHECKPOINT roles:         INSPECTOR
  email                text,
  temp_password        text,
  phone                text,
  national_id          text,
  is_main_contact      boolean     NOT NULL DEFAULT false,
  status               text        NOT NULL DEFAULT 'ACTIVE',
  -- Values: ACTIVE | INACTIVE
  auth_account_created boolean     NOT NULL DEFAULT false,
  registered_by_id     text,
  registered_by_name   text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Add any columns that may be missing from an earlier version of this table
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS facility_code        text;
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS temp_password        text;
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS phone                text;
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS national_id          text;
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS auth_account_created boolean DEFAULT false;
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS registered_by_id     text;
ALTER TABLE facility_staff ADD COLUMN IF NOT EXISTS registered_by_name   text;

-- -------------------------------------------------------------------------
-- Facility Documents
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facility_documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     uuid        NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  facility_code   text        NOT NULL,
  document_type   text        NOT NULL,
  -- Values: LICENSE | ACCREDITATION | PHOTO | OTHER
  file_name       text        NOT NULL,
  file_url        text        NOT NULL,
  uploaded_by_id  text,
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- Facility Staff Documents
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facility_staff_documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_staff_id uuid        NOT NULL REFERENCES facility_staff(id) ON DELETE CASCADE,
  facility_id       uuid        NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  document_type     text        NOT NULL,
  -- Values: NATIONAL_ID | CERTIFICATE | OTHER
  file_name         text        NOT NULL,
  file_url          text        NOT NULL,
  uploaded_by_id    text,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_facilities_type    ON facilities(facility_type);
CREATE INDEX IF NOT EXISTS idx_facilities_region  ON facilities(region_code);
CREATE INDEX IF NOT EXISTS idx_facilities_status  ON facilities(status);
CREATE INDEX IF NOT EXISTS idx_fstaff_facility    ON facility_staff(facility_id);
CREATE INDEX IF NOT EXISTS idx_fstaff_role        ON facility_staff(staff_role);
CREATE INDEX IF NOT EXISTS idx_fstaff_email       ON facility_staff(email);
CREATE INDEX IF NOT EXISTS idx_facdocs_facility   ON facility_documents(facility_id);
CREATE INDEX IF NOT EXISTS idx_staffdocs_staff    ON facility_staff_documents(facility_staff_id);

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

ALTER TABLE facilities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_staff_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe to run multiple times)
DROP POLICY IF EXISTS facilities_select  ON facilities;
DROP POLICY IF EXISTS fstaff_select      ON facility_staff;
DROP POLICY IF EXISTS facdocs_select     ON facility_documents;
DROP POLICY IF EXISTS staffdocs_select   ON facility_staff_documents;
DROP POLICY IF EXISTS facilities_insert  ON facilities;
DROP POLICY IF EXISTS facilities_update  ON facilities;
DROP POLICY IF EXISTS fstaff_insert      ON facility_staff;
DROP POLICY IF EXISTS fstaff_update      ON facility_staff;
DROP POLICY IF EXISTS facdocs_insert     ON facility_documents;
DROP POLICY IF EXISTS staffdocs_insert   ON facility_staff_documents;

-- All authenticated users can read (field portal, export portal, ministry)
CREATE POLICY facilities_select  ON facilities               FOR SELECT TO authenticated USING (true);
CREATE POLICY fstaff_select      ON facility_staff           FOR SELECT TO authenticated USING (true);
CREATE POLICY facdocs_select     ON facility_documents       FOR SELECT TO authenticated USING (true);
CREATE POLICY staffdocs_select   ON facility_staff_documents FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert / update
CREATE POLICY facilities_insert  ON facilities               FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY facilities_update  ON facilities               FOR UPDATE TO authenticated USING (true);
CREATE POLICY fstaff_insert      ON facility_staff           FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fstaff_update      ON facility_staff           FOR UPDATE TO authenticated USING (true);
CREATE POLICY facdocs_insert     ON facility_documents       FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY staffdocs_insert   ON facility_staff_documents FOR INSERT TO authenticated WITH CHECK (true);

-- -------------------------------------------------------------------------
-- Sample Facilities
-- -------------------------------------------------------------------------

INSERT INTO facilities (
  facility_code, facility_name, facility_type, status, region_code,
  location_address, capacity, species_handled,
  license_number, license_expiry_date, issuing_authority,
  contact_name, contact_phone, registered_by_name
)
VALUES
  ('QS-BAR-00001', 'Bossaso Quarantine Station',     'QUARANTINE_STATION', 'ACTIVE', 'BAR',
   'Bossaso Port Road, Bossaso',             500, ARRAY['CATTLE','CAMEL','GOAT','SHEEP'],
   'MOL-QS-2025-001', '2027-06-30', 'Ministry of Livestock',
   'Dr. Abdi Farah',      '+252 90 123 4567', 'Ministry Registration'),

  ('QS-BAN-00001', 'Mogadishu Central Quarantine',   'QUARANTINE_STATION', 'ACTIVE', 'BAN',
   'KM-5, Mogadishu',                        800, ARRAY['CATTLE','CAMEL','GOAT','SHEEP'],
   'MOL-QS-2025-002', '2027-06-30', 'Ministry of Livestock',
   'Dr. Hodan Omar',      '+252 61 234 5678', 'Ministry Registration'),

  ('SH-BAN-00001', 'Mogadishu Municipal Abattoir',   'SLAUGHTERHOUSE',     'ACTIVE', 'BAN',
   'Industrial Zone, Mogadishu',             200, ARRAY['CATTLE','CAMEL','GOAT','SHEEP'],
   'MOL-SH-2025-001', '2026-12-31', 'Ministry of Livestock',
   'Hassan Warsame',      '+252 61 345 6789', 'Ministry Registration'),

  ('SH-BAR-00001', 'Bossaso Slaughterhouse',         'SLAUGHTERHOUSE',     'ACTIVE', 'BAR',
   'South Bossaso Industrial Area',          120, ARRAY['CATTLE','GOAT','SHEEP'],
   'MOL-SH-2025-002', '2026-12-31', 'Ministry of Livestock',
   'Ahmed Ismail',        '+252 90 456 7890', 'Ministry Registration'),

  ('CP-GED-00001', 'Doolow Border Checkpoint',       'CHECKPOINT',         'ACTIVE', 'GED',
   'Doolow, Ethiopia Border',               NULL, NULL,
   'MOL-CP-2025-001', '2027-12-31', 'Ministry of Livestock',
   'Ibrahim Nur',         '+252 46 567 8901', 'Ministry Registration'),

  ('CP-BAR-00001', 'Bossaso Port Checkpoint',        'CHECKPOINT',         'ACTIVE', 'BAR',
   'Bossaso Seaport',                       NULL, NULL,
   'MOL-CP-2025-002', '2027-12-31', 'Ministry of Livestock',
   'Fatima Abdi',         '+252 90 678 9012', 'Ministry Registration'),

  ('CP-WOQ-00001', 'Tog Wajaale Border Checkpoint',  'CHECKPOINT',         'ACTIVE', 'WOQ',
   'Tog Wajaale, Somaliland-Ethiopia Border', NULL, NULL,
   'MOL-CP-2025-003', '2027-12-31', 'Ministry of Livestock',
   'Abdirahman Mohamed',  '+252 63 789 0123', 'Ministry Registration')

ON CONFLICT (facility_code) DO NOTHING;

-- -------------------------------------------------------------------------
-- Sample Staff (insert only if not already present for that facility)
-- -------------------------------------------------------------------------

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'QS-BAR-00001', 'Dr. Abdi Farah', 'QUARANTINE_SUPERVISOR', 'abdi.farah@somlits.gov.so', '+252 90 123 4567', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'QS-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'QS-BAR-00001' AND email = 'abdi.farah@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'QS-BAR-00001', 'Dr. Maryan Warsame', 'VETERINARY_OFFICER', 'maryan.w@somlits.gov.so', '+252 90 234 5678', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'QS-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'QS-BAR-00001' AND email = 'maryan.w@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'QS-BAR-00001', 'Ahmed Hirsi', 'LAB_TECHNICIAN', 'ahmed.lab@somlits.gov.so', '+252 90 345 6789', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'QS-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'QS-BAR-00001' AND email = 'ahmed.lab@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'SH-BAN-00001', 'Hassan Warsame', 'SLAUGHTER_SUPERVISOR', 'hassan.w@somlits.gov.so', '+252 61 345 6789', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'SH-BAN-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'SH-BAN-00001' AND email = 'hassan.w@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'SH-BAN-00001', 'Sheikh Omar Ali', 'HALAL_SUPERVISOR', 'sheikh.omar@somlits.gov.so', '+252 61 456 7890', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'SH-BAN-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'SH-BAN-00001' AND email = 'sheikh.omar@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'SH-BAN-00001', 'Dr. Faadumo Hirsi', 'MEAT_INSPECTOR', 'faadumo.h@somlits.gov.so', '+252 61 567 8901', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'SH-BAN-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'SH-BAN-00001' AND email = 'faadumo.h@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'CP-GED-00001', 'Ibrahim Nur', 'INSPECTOR', 'ibrahim.nur@somlits.gov.so', '+252 46 567 8901', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'CP-GED-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'CP-GED-00001' AND email = 'ibrahim.nur@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'CP-GED-00001', 'Caasha Jama', 'INSPECTOR', 'caasha.j@somlits.gov.so', '+252 46 678 9012', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'CP-GED-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'CP-GED-00001' AND email = 'caasha.j@somlits.gov.so');

-- -------------------------------------------------------------------------
-- Add Staff for remaining facilities (missing from original seed)
-- -------------------------------------------------------------------------

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'SH-BAR-00001', 'Mohamed Hassan Ali', 'SLAUGHTER_SUPERVISOR', 'mohamed.ali@somlits.gov.so', '+252 90 111 2233', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'SH-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'SH-BAR-00001' AND email = 'mohamed.ali@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'SH-BAR-00001', 'Sheikh Yusuf Abdi', 'HALAL_SUPERVISOR', 'yusuf.abdi@somlits.gov.so', '+252 90 222 3344', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'SH-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'SH-BAR-00001' AND email = 'yusuf.abdi@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'SH-BAR-00001', 'Dr. Hodan Jama', 'MEAT_INSPECTOR', 'hodan.jama@somlits.gov.so', '+252 90 333 4455', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'SH-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'SH-BAR-00001' AND email = 'hodan.jama@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'QS-BAN-00001', 'Dr. Hodan Omar', 'QUARANTINE_SUPERVISOR', 'hodan.omar@somlits.gov.so', '+252 61 234 5678', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'QS-BAN-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'QS-BAN-00001' AND email = 'hodan.omar@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'QS-BAN-00001', 'Dr. Abdirahman Bile', 'VETERINARY_OFFICER', 'abdirahman.bile@somlits.gov.so', '+252 61 345 6789', false, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'QS-BAN-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'QS-BAN-00001' AND email = 'abdirahman.bile@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'CP-BAR-00001', 'Fatima Abdi', 'INSPECTOR', 'fatima.abdi@somlits.gov.so', '+252 90 678 9012', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'CP-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'CP-BAR-00001' AND email = 'fatima.abdi@somlits.gov.so');

INSERT INTO facility_staff (facility_id, facility_code, staff_name, staff_role, email, phone, is_main_contact, status, registered_by_name)
SELECT f.id, 'CP-WOQ-00001', 'Abdirahman Mohamed', 'INSPECTOR', 'abdirahman.m@somlits.gov.so', '+252 63 789 0123', true, 'ACTIVE', 'Ministry Registration'
FROM facilities f WHERE f.facility_code = 'CP-WOQ-00001'
AND NOT EXISTS (SELECT 1 FROM facility_staff WHERE facility_code = 'CP-WOQ-00001' AND email = 'abdirahman.m@somlits.gov.so');

-- -------------------------------------------------------------------------
-- Add GPS coordinates to all sample facilities
-- -------------------------------------------------------------------------

UPDATE facilities SET latitude = 11.285000, longitude = 49.179000 WHERE facility_code = 'QS-BAR-00001' AND latitude IS NULL;
UPDATE facilities SET latitude =  2.046000, longitude = 45.298000 WHERE facility_code = 'QS-BAN-00001' AND latitude IS NULL;
UPDATE facilities SET latitude =  2.066000, longitude = 45.316000 WHERE facility_code = 'SH-BAN-00001' AND latitude IS NULL;
UPDATE facilities SET latitude = 11.279000, longitude = 49.165000 WHERE facility_code = 'SH-BAR-00001' AND latitude IS NULL;
UPDATE facilities SET latitude =  4.178000, longitude = 42.077000 WHERE facility_code = 'CP-GED-00001' AND latitude IS NULL;
UPDATE facilities SET latitude = 11.284000, longitude = 49.196000 WHERE facility_code = 'CP-BAR-00001' AND latitude IS NULL;
UPDATE facilities SET latitude =  9.981000, longitude = 43.471000 WHERE facility_code = 'CP-WOQ-00001' AND latitude IS NULL;

-- Fill missing issuing_authority
UPDATE facilities SET issuing_authority = 'Ministry of Livestock' WHERE issuing_authority IS NULL;

-- -------------------------------------------------------------------------
-- Sample Documents (demo — replace file_url with real Supabase Storage URLs)
-- -------------------------------------------------------------------------

INSERT INTO facility_documents (facility_id, facility_code, document_type, file_name, file_url, uploaded_by_id, uploaded_at)
SELECT f.id, 'SH-BAR-00001', 'LICENSE', 'MOL-SH-2025-002-License.pdf',
  'https://www.africau.edu/images/default/sample.pdf', 'system', now()
FROM facilities f WHERE f.facility_code = 'SH-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_documents WHERE facility_code = 'SH-BAR-00001' AND document_type = 'LICENSE');

INSERT INTO facility_documents (facility_id, facility_code, document_type, file_name, file_url, uploaded_by_id, uploaded_at)
SELECT f.id, 'SH-BAR-00001', 'PHOTO', 'bossaso-slaughterhouse-photo.jpg',
  'https://picsum.photos/seed/sh-bar/800/600', 'system', now()
FROM facilities f WHERE f.facility_code = 'SH-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_documents WHERE facility_code = 'SH-BAR-00001' AND document_type = 'PHOTO');

INSERT INTO facility_documents (facility_id, facility_code, document_type, file_name, file_url, uploaded_by_id, uploaded_at)
SELECT f.id, 'QS-BAR-00001', 'LICENSE', 'MOL-QS-2025-001-License.pdf',
  'https://www.africau.edu/images/default/sample.pdf', 'system', now()
FROM facilities f WHERE f.facility_code = 'QS-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_documents WHERE facility_code = 'QS-BAR-00001' AND document_type = 'LICENSE');

INSERT INTO facility_documents (facility_id, facility_code, document_type, file_name, file_url, uploaded_by_id, uploaded_at)
SELECT f.id, 'QS-BAR-00001', 'ACCREDITATION', 'QS-BAR-00001-Accreditation.pdf',
  'https://www.africau.edu/images/default/sample.pdf', 'system', now()
FROM facilities f WHERE f.facility_code = 'QS-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_documents WHERE facility_code = 'QS-BAR-00001' AND document_type = 'ACCREDITATION');

INSERT INTO facility_documents (facility_id, facility_code, document_type, file_name, file_url, uploaded_by_id, uploaded_at)
SELECT f.id, 'QS-BAR-00001', 'PHOTO', 'bossaso-quarantine-photo.jpg',
  'https://picsum.photos/seed/qs-bar/800/600', 'system', now()
FROM facilities f WHERE f.facility_code = 'QS-BAR-00001'
AND NOT EXISTS (SELECT 1 FROM facility_documents WHERE facility_code = 'QS-BAR-00001' AND document_type = 'PHOTO');
