-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Supabase Schema + Seed Data
-- Run this entire file in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── Drop existing tables (safe re-run) ────────────────────────────
drop table if exists exported_batches cascade;
drop table if exists outgoing_movements cascade;
drop table if exists incoming_movements cascade;
drop table if exists animals cascade;
drop table if exists batches cascade;
drop table if exists premises cascade;

-- ── Premises ──────────────────────────────────────────────────────
create table premises (
  id           uuid default gen_random_uuid() primary key,
  code         text not null unique,
  name         text not null,
  type         text not null default 'Farm',
  status       text not null default 'APPROVED',
  owner_id     text,
  region       text not null,
  lat          numeric,
  lng          numeric,
  created_at   timestamptz default now()
);

-- ── Batches (Available tab) ────────────────────────────────────────
create table batches (
  id              text primary key,
  batch_code      text not null,
  batch_name      text not null,
  species         text not null,
  breed           text not null,
  count           integer not null,
  status          text not null,
  premises_code   text not null,
  region          text not null,
  owner_id        text,
  created_at      text not null,
  submitted_at    text,
  approved_at     text
);

-- ── Animals (within a batch) ───────────────────────────────────────
create table animals (
  id           text primary key,
  batch_id     text references batches(id) on delete cascade,
  seq          integer not null,
  sex          text not null,
  age_months   integer default 0,
  weight_kg    numeric default 0,
  features     text default '',
  animal_id    text,
  tag_serial   text,
  tag_type     text,
  tag_color    text,
  tag_status   text not null default 'UNTAGGED',
  photo_url    text,
  created_at   timestamptz default now()
);

-- ── Incoming movements ─────────────────────────────────────────────
create table incoming_movements (
  id               text primary key,
  move_code        text not null,
  batch_name       text not null,
  species          text not null,
  count            integer not null,
  from_premises    text not null,
  from_region      text not null,
  from_owner       text not null,
  status           text not null,
  expected_arrival text not null,
  departed_at      text,
  to_owner_id      text,
  created_at       timestamptz default now()
);

-- ── Outgoing movements ─────────────────────────────────────────────
create table outgoing_movements (
  id               text primary key,
  move_code        text not null,
  batch_name       text not null,
  species          text not null,
  count            integer not null,
  to_premises      text not null,
  to_region        text not null,
  to_owner         text not null,
  status           text not null,
  departure_date   text not null,
  from_owner_id    text,
  created_at       timestamptz default now()
);

-- ── Exported batches ───────────────────────────────────────────────
create table exported_batches (
  id                   text primary key,
  export_code          text not null,
  batch_name           text not null,
  species              text not null,
  count                integer not null,
  destination_country  text not null,
  port                 text not null,
  export_company       text not null,
  status               text not null,
  departure_date       text not null,
  cleared_at           text,
  owner_id             text,
  created_at           timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════════
-- SEED DATA  (matches existing mock data)
-- ══════════════════════════════════════════════════════════════════

-- Premises
insert into premises (code, name, type, status, region, lat, lng) values
  ('SOM-MOG-004', 'Daynile Farm',   'Farm', 'APPROVED', 'Banaadir',    2.1167, 45.2837),
  ('SOM-BAY-011', 'Baidoa Farm',    'Farm', 'APPROVED', 'Bay',         3.1167, 43.6483),
  ('SOM-JUB-004', 'Kismayo Farm',   'Farm', 'APPROVED', 'Lower Jubba', 0.3582, 42.5454),
  ('SOM-MOG-007', 'Mogadishu Farm', 'Farm', 'APPROVED', 'Banaadir',    2.0469, 45.3182),
  ('SOM-HRS-002', 'Jowhar Farm',    'Farm', 'APPROVED', 'Hiiraan',     2.7807, 45.5039);

-- Batches
insert into batches (id, batch_code, batch_name, species, breed, count, status, premises_code, region, created_at, submitted_at, approved_at) values
  ('b1', 'HRD-2026-MOG-001', 'Daynile Zebu Herd — Aug 2026', 'Cattle', 'Somali Zebu',       6, 'TAGGED',       'SOM-MOG-004', 'Banaadir',    '2026-07-15', '2026-07-16', '2026-07-20'),
  ('b2', 'HRD-2026-BAY-002', 'Baidoa Sheep Flock',           'Sheep',  'Somali Blackhead',  4, 'APPROVED',     'SOM-BAY-011', 'Bay',         '2026-07-28', '2026-07-29', '2026-08-01'),
  ('b3', 'HRD-2026-KIS-003', 'Kismayo Goat Herd',            'Goat',   'Somali',            3, 'UNDER_REVIEW', 'SOM-JUB-004', 'Lower Jubba', '2026-08-02', '2026-08-02', null),
  ('b4', 'HRD-2026-MOG-004', 'My Camel Group',               'Camel',  'Somali Dromedary',  2, 'DRAFT',        'SOM-MOG-007', 'Banaadir',    '2026-08-03', null,         null),
  ('b5', 'HRD-2026-JOW-005', 'Jowhar Cattle Batch',          'Cattle', 'Somali Zebu',       3, 'REJECTED',     'SOM-HRS-002', 'Hiiraan',     '2026-07-10', '2026-07-11', null);

-- Animals in batch b1 (TAGGED cattle)
insert into animals (id, batch_id, seq, sex, age_months, weight_kg, features, animal_id, tag_serial, tag_type, tag_color, tag_status) values
  ('ba1', 'b1', 1, 'M', 36, 280, 'White patch on left ear', '9001000441', '9001000441', 'RFID', 'yellow', 'TAGGED'),
  ('ba2', 'b1', 2, 'M', 42, 310, 'Brown coat',              '9001000442', '9001000442', 'RFID', 'yellow', 'TAGGED'),
  ('ba3', 'b1', 3, 'F', 28, 245, 'Black face',              '9001000443', '9001000443', 'RFID', 'yellow', 'TAGGED'),
  ('ba4', 'b1', 4, 'M', 30, 265, '',                        '9001000444', '9001000444', 'RFID', 'yellow', 'TAGGED'),
  ('ba5', 'b1', 5, 'F', 24, 220, 'Spotted',                 '9001000445', '9001000445', 'RFID', 'yellow', 'TAGGED'),
  ('ba6', 'b1', 6, 'M', 48, 340, 'Large hump',              '9001000446', '9001000446', 'RFID', 'yellow', 'TAGGED');

-- Animals in batch b2 (APPROVED sheep, untagged)
insert into animals (id, batch_id, seq, sex, age_months, weight_kg, features, animal_id, tag_serial, tag_type, tag_color, tag_status) values
  ('bb1', 'b2', 1, 'M', 18, 36, '',            '9001000201', '9001000201', 'EAR_TAG', 'yellow', 'UNTAGGED'),
  ('bb2', 'b2', 2, 'M', 20, 38, 'Black legs',  '9001000202', '9001000202', 'EAR_TAG', 'yellow', 'UNTAGGED'),
  ('bb3', 'b2', 3, 'F', 16, 30, '',            '9001000203', '9001000203', 'EAR_TAG', 'yellow', 'UNTAGGED'),
  ('bb4', 'b2', 4, 'F', 15, 28, 'White blaze', '9001000204', '9001000204', 'EAR_TAG', 'yellow', 'UNTAGGED');

-- Animals in batch b3 (goats, untagged)
insert into animals (id, batch_id, seq, sex, age_months, weight_kg, features, tag_status) values
  ('bc1', 'b3', 1, 'M', 24, 42, '',            'UNTAGGED'),
  ('bc2', 'b3', 2, 'F', 18, 32, '',            'UNTAGGED'),
  ('bc3', 'b3', 3, 'F', 20, 35, 'Brown coat',  'UNTAGGED');

-- Animals in batch b4 (camels, draft)
insert into animals (id, batch_id, seq, sex, age_months, weight_kg, features, tag_status) values
  ('bd1', 'b4', 1, 'M', 60, 450, 'Dark brown', 'UNTAGGED'),
  ('bd2', 'b4', 2, 'F', 48, 380, '',           'UNTAGGED');

-- Animals in batch b5 (rejected cattle)
insert into animals (id, batch_id, seq, sex, age_months, weight_kg, features, tag_status) values
  ('be1', 'b5', 1, 'M', 30, 270, '', 'UNTAGGED'),
  ('be2', 'b5', 2, 'M', 34, 290, '', 'UNTAGGED'),
  ('be3', 'b5', 3, 'F', 26, 235, '', 'UNTAGGED');

-- Incoming movements
insert into incoming_movements (id, move_code, batch_name, species, count, from_premises, from_region, from_owner, status, expected_arrival, departed_at) values
  ('in1', 'MVT-2026-BAY-041', 'Zebu Herd from Bay Farm',     'Cattle', 8,  'SOM-BAY-003', 'Bay',         'Abdi Hassan Farm',    'IN_TRANSIT', '2026-08-07', '2026-08-05'),
  ('in2', 'MVT-2026-HRS-018', 'Hiiraan Goat Purchase',       'Goat',   12, 'SOM-HRS-009', 'Hiiraan',     'Yusuf Livestock Co.', 'APPROVED',   '2026-08-10', null),
  ('in3', 'MVT-2026-JUB-007', 'Lower Jubba Sheep Group',     'Sheep',  6,  'SOM-JUB-002', 'Lower Jubba', 'Hassan Traders',      'SUBMITTED',  '2026-08-14', null);

-- Outgoing movements
insert into outgoing_movements (id, move_code, batch_name, species, count, to_premises, to_region, to_owner, status, departure_date) values
  ('out1', 'MVT-2026-MOG-039', 'Export Cattle to Berbera Port', 'Cattle', 6, 'SOM-WOQ-002', 'Woqooyi Galbeed', 'Berbera Export Co.',         'SUBMITTED', '2026-08-08'),
  ('out2', 'MVT-2026-BAY-042', 'Sheep Sale — Baidoa Market',    'Sheep',  4, 'SOM-BAY-011', 'Bay',             'Baidoa Livestock Market',     'DRAFT',     '2026-08-12');

-- Exported batches
insert into exported_batches (id, export_code, batch_name, species, count, destination_country, port, export_company, status, departure_date, cleared_at) values
  ('exp1', 'EXP-2026-MOG-012', 'Daynile Zebu Herd — UAE Export',       'Cattle', 6,  'United Arab Emirates', 'Berbera Port',    'Berbera Export Co.',                'COMPLETED', '2026-07-22', '2026-07-24'),
  ('exp2', 'EXP-2026-BAY-008', 'Somali Blackhead Sheep — Oman',        'Sheep',  20, 'Oman',                 'Mogadishu Port',  'Mogadishu Livestock Exports Ltd.',  'CLEARED',   '2026-08-01', '2026-08-03'),
  ('exp3', 'EXP-2026-MOG-019', 'Dromedary Camel Group — Saudi Arabia', 'Camel',  4,  'Saudi Arabia',         'Berbera Port',    'Gulf Livestock Trading LLC',        'APPROVED',  '2026-08-15', null);

-- ── Disable RLS for now (enable + add policies when auth is ready) ──
alter table premises           disable row level security;
alter table batches            disable row level security;
alter table animals            disable row level security;
alter table incoming_movements disable row level security;
alter table outgoing_movements disable row level security;
alter table exported_batches   disable row level security;
