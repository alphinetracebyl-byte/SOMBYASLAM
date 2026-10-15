-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Test Farmer Seed Data
-- Run this in Supabase → SQL Editor to populate the Farmers page
-- ══════════════════════════════════════════════════════════════════

INSERT INTO farmers (
  full_name, phone_e164, national_id, id_type,
  region, district, village,
  gender, date_of_birth,
  status, approved_at, approved_by,
  created_at, updated_at
) VALUES
(
  'Ahmed Hassan Warsame',
  '+252612345001',
  'SO-NID-2024-001001',
  'NATIONAL_ID',
  'Banaadir', 'Hodan', 'Wadajir',
  'MALE', '1985-03-15',
  'APPROVED', now(), 'SYSTEM',
  now() - interval '10 days', now() - interval '10 days'
),
(
  'Faadumo Said Moalim',
  '+252612345002',
  'SO-NID-2024-001002',
  'NATIONAL_ID',
  'Bay', 'Baidoa', 'Dinsoor',
  'FEMALE', '1990-07-22',
  'APPROVED', now(), 'SYSTEM',
  now() - interval '8 days', now() - interval '8 days'
),
(
  'Halimo Nur Ibrahim',
  '+252612345003',
  'SO-NID-2024-001003',
  'NATIONAL_ID',
  'Bari', 'Bosaso', 'Qandala',
  'FEMALE', '1978-11-05',
  'PENDING', null, null,
  now() - interval '2 days', now() - interval '2 days'
),
(
  'Abdullahi Omar Farah',
  '+252612345004',
  'SO-NID-2024-001004',
  'NATIONAL_ID',
  'Hiiraan', 'Beledweyne', 'Mataban',
  'MALE', '1982-01-30',
  'PENDING', null, null,
  now() - interval '1 day', now() - interval '1 day'
),
(
  'Osman Ali Jama',
  '+252612345005',
  'SO-NID-2024-001005',
  'NATIONAL_ID',
  'Woqooyi Galbeed', 'Hargeisa', 'Gabiley',
  'MALE', '1975-09-12',
  'APPROVED', now(), 'SYSTEM',
  now() - interval '15 days', now() - interval '15 days'
),
(
  'Maryam Hassan Aden',
  '+252612345006',
  'SO-NID-2024-001006',
  'NATIONAL_ID',
  'Jubbada Hoose', 'Kismayo', 'Afmadow',
  'FEMALE', '1993-05-18',
  'SUSPENDED', null, null,
  now() - interval '20 days', now() - interval '5 days'
),
(
  'Fadumo Warsame Ali',
  '+252612345007',
  'SO-NID-2024-001007',
  'NATIONAL_ID',
  'Bakool', 'Hudur', 'Rab Dhuure',
  'FEMALE', '1988-12-03',
  'PENDING', null, null,
  now() - interval '3 hours', now() - interval '3 hours'
),
(
  'Mahad Yusuf Sheikh',
  '+252612345008',
  'SO-NID-2024-001008',
  'NATIONAL_ID',
  'Mudug', 'Gaalkacyo', 'Hobyo',
  'MALE', '1970-04-25',
  'APPROVED', now() - interval '12 days', 'SYSTEM',
  now() - interval '12 days', now() - interval '12 days'
);
