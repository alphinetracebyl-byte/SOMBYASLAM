-- ══════════════════════════════════════════════════════════════════════════════
-- SOMLITS — Animal Registration Schema
-- Run this in Supabase SQL Editor.
-- Replaces the basic animals + batches tables from supabase-schema.sql.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Clean up old tables ────────────────────────────────────────────────────
drop table if exists animal_photos    cascade;
drop table if exists animals          cascade;
drop table if exists batches          cascade;

-- ── 2. Animal code sequence (national ID: SOM-XXXXXXXXXX) ────────────────────
drop sequence if exists animal_code_seq;
create sequence animal_code_seq start with 9001001000 increment by 1 no cycle;

-- ── 3. Batches ────────────────────────────────────────────────────────────────
-- A batch is a group registration session opened by a field inspector or vet.
-- One batch = one species + one premises + one registration event.

create table batches (
  id             uuid        primary key default gen_random_uuid(),
  batch_code     text        not null unique,           -- HRD-2026-MOG-001
  batch_name     text        not null,
  species        text        not null
                   check (species in ('CATTLE','CAMEL','GOAT','SHEEP')),
  breed          text        not null,
  count          integer     not null default 0
                   check (count >= 0),
  status         text        not null default 'DRAFT'
                   check (status in (
                     'DRAFT','SUBMITTED','UNDER_REVIEW',
                     'APPROVED','REJECTED','TAGGED','CLOSED'
                   )),
  premises_code  text        not null,                  -- FK to farmer_premises.premises_code
  region         text        not null,                  -- region name text (display)
  owner_id       text,                                  -- auth.uid()::text of the farmer
  notes          text,
  created_at     timestamptz not null default now(),
  submitted_at   timestamptz,
  approved_at    timestamptz,
  closed_at      timestamptz
);

comment on column batches.owner_id is 'Supabase auth.uid() cast to text — used in RLS';
comment on column batches.premises_code is 'References farmer_premises.premises_code';

-- ── 4. Animals ────────────────────────────────────────────────────────────────
-- One row per individual animal. Links to its batch for group context.

create table animals (

  -- ── Identity ────────────────────────────────────────────────────────────────
  id               uuid        primary key default gen_random_uuid(),
  animal_code      text        not null unique
                     default ('SOM-' || lpad(nextval('animal_code_seq')::text, 10, '0')),
  batch_id         uuid        references batches(id) on delete set null,
  seq              integer,                             -- position within batch (1, 2, 3…)

  -- ── Species & Breed ─────────────────────────────────────────────────────────
  species          text        not null
                     check (species in ('CATTLE','CAMEL','GOAT','SHEEP')),
  breed            text        not null,

  -- ── Demographics ────────────────────────────────────────────────────────────
  sex              text        not null
                     check (sex in ('MALE','FEMALE','UNKNOWN')),
  dob              date,
  dob_precision    text        not null default 'UNKNOWN'
                     check (dob_precision in ('EXACT','ESTIMATED','UNKNOWN')),
  age_months       integer     check (age_months >= 0),
  weight_kg        numeric(6,1) check (weight_kg > 0),

  -- ── Physical Description ────────────────────────────────────────────────────
  coat_color           text,
  coat_pattern         text
                         check (coat_pattern in ('SOLID','SPOTTED','PIEBALD','STRIPED')),
  horn_status          text
                         check (horn_status in ('HORNED','POLLED','DEHORNED','NA')),
  body_condition_score smallint
                         check (body_condition_score between 1 and 5),
  distinguishing_marks text,

  -- ── Tagging ─────────────────────────────────────────────────────────────────
  tag_serial           text,
  tag_type             text
                         check (tag_type in ('RFID','EAR_TAG','BOTH')),
  tag_color            text,
  tag_placement        text
                         check (tag_placement in ('LEFT_EAR','RIGHT_EAR','BOTH_EARS')),
  secondary_tag_serial text,                           -- RFID number when tag_type = BOTH
  tag_status           text        not null default 'UNTAGGED'
                         check (tag_status in ('TAGGED','UNTAGGED','MISSING','DAMAGED')),

  -- ── Registration Type ───────────────────────────────────────────────────────
  submission_type      text        not null
                         check (submission_type in ('BIRTH','PURCHASE','IMPORT')),

  -- ── Birth Origin (submission_type = BIRTH) ──────────────────────────────────
  dam_tag_serial       text,                           -- mother's tag serial
  sire_tag_serial      text,                           -- father's tag serial

  -- ── Purchase Origin (submission_type = PURCHASE) ────────────────────────────
  source_owner_name    text,
  source_premises_id   text,
  purchase_date        date,
  purchase_price_sos   numeric(14,0),                  -- Somali Shillings

  -- ── Import Origin (submission_type = IMPORT) ────────────────────────────────
  country_of_origin    text,
  import_permit_number text,
  port_of_entry        text
                         check (port_of_entry in (
                           'Mogadishu','Berbera','Kismayo','Bosaso','Marka'
                         ) or port_of_entry is null),
  import_date          date,

  -- ── Health at Registration ───────────────────────────────────────────────────
  health_status        text        not null default 'UNKNOWN'
                         check (health_status in (
                           'HEALTHY','SICK','UNKNOWN','RESTRICTED','UNDER_TREATMENT'
                         )),
  vaccination_status   text        not null default 'UNKNOWN'
                         check (vaccination_status in (
                           'VACCINATED','PARTIALLY_VACCINATED','UNVACCINATED','UNKNOWN'
                         )),
  last_vaccination_date date,
  vaccination_types    text[],                         -- e.g. {'FMD','PPR','Anthrax'}
  deworming_status     text        default 'UNKNOWN'
                         check (deworming_status in ('DONE','NOT_DONE','UNKNOWN')),
  veterinary_notes     text,

  -- ── Ownership & Location ─────────────────────────────────────────────────────
  current_owner_id     text,                           -- auth.uid()::text of current owner
  current_premises_id  text,                           -- farmer_premises.premises_code

  -- ── Lifecycle Status ─────────────────────────────────────────────────────────
  status               text        not null default 'ACTIVE'
                         check (status in (
                           'DRAFT','SUBMITTED','VERIFIED','ACTIVE',
                           'RESTRICTED','MISSING','DEAD','SLAUGHTERED',
                           'EXPORTED','CONFISCATED','ARCHIVED'
                         )),
  terminated_at        timestamptz,

  -- ── Audit ─────────────────────────────────────────────────────────────────────
  registered_at        timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on column animals.animal_code      is 'National ID: SOM-9001001000 — system generated';
comment on column animals.submission_type  is 'BIRTH | PURCHASE | IMPORT';
comment on column animals.current_owner_id is 'Supabase auth.uid()::text';
comment on column animals.vaccination_types is 'Array of vaccine names, e.g. {FMD, PPR}';

-- ── 5. Animal Photos ──────────────────────────────────────────────────────────

create table animal_photos (
  id              uuid        primary key default gen_random_uuid(),
  animal_id       uuid        not null references animals(id) on delete cascade,
  photo_type      text        not null
                    check (photo_type in (
                      'PRIMARY','LEFT_SIDE','RIGHT_SIDE','FRONT_FACE','EAR_TAG'
                    )),
  status          text        not null default 'ACTIVE'
                    check (status in ('ACTIVE','DELETED','ARCHIVED')),
  blob_url        text        not null,
  file_size_bytes bigint,
  content_type    text        not null default 'image/jpeg',
  taken_at        timestamptz,
  caption         text,
  uploaded_at     timestamptz not null default now(),
  confirmed_at    timestamptz
);

-- ── 6. Auto-update trigger ────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger animals_set_updated_at
  before update on animals
  for each row execute function set_updated_at();

-- ── 7. Row Level Security ─────────────────────────────────────────────────────

alter table batches       enable row level security;
alter table animals       enable row level security;
alter table animal_photos enable row level security;

-- Batches: farmers see and manage only their own
create policy "farmers_select_own_batches"
  on batches for select
  using (owner_id = auth.uid()::text);

create policy "farmers_insert_own_batches"
  on batches for insert
  with check (owner_id = auth.uid()::text);

create policy "farmers_update_own_batches"
  on batches for update
  using (owner_id = auth.uid()::text);

create policy "farmers_delete_own_batches"
  on batches for delete
  using (owner_id = auth.uid()::text);

-- Animals: farmers see and manage only their own
create policy "farmers_select_own_animals"
  on animals for select
  using (current_owner_id = auth.uid()::text);

create policy "farmers_insert_own_animals"
  on animals for insert
  with check (current_owner_id = auth.uid()::text);

create policy "farmers_update_own_animals"
  on animals for update
  using (current_owner_id = auth.uid()::text);

create policy "farmers_delete_own_animals"
  on animals for delete
  using (current_owner_id = auth.uid()::text);

-- Photos: farmers see photos of their own animals
create policy "farmers_select_own_photos"
  on animal_photos for select
  using (
    animal_id in (
      select id from animals
      where current_owner_id = auth.uid()::text
    )
  );

create policy "farmers_insert_own_photos"
  on animal_photos for insert
  with check (
    animal_id in (
      select id from animals
      where current_owner_id = auth.uid()::text
    )
  );

-- ── 8. Indexes ────────────────────────────────────────────────────────────────

create index idx_batches_owner     on batches (owner_id);
create index idx_batches_premises  on batches (premises_code);
create index idx_batches_status    on batches (status);
create index idx_batches_species   on batches (species);

create index idx_animals_batch     on animals (batch_id);
create index idx_animals_owner     on animals (current_owner_id);
create index idx_animals_premises  on animals (current_premises_id);
create index idx_animals_status    on animals (status);
create index idx_animals_code      on animals (animal_code);
create index idx_animals_tag       on animals (tag_serial);
create index idx_animals_species   on animals (species);

create index idx_photos_animal     on animal_photos (animal_id);
create index idx_photos_status     on animal_photos (animal_id, status);

-- ── 9. Demo Seed Data ─────────────────────────────────────────────────────────
-- Uses UUIDs for id columns. Leaves owner_id null so all authenticated users
-- can see this data during development. Tighten with real user IDs in production.

-- Temporarily allow public read for demo purposes
create policy "public_demo_read_batches"
  on batches for select
  using (owner_id is null);

create policy "public_demo_read_animals"
  on animals for select
  using (current_owner_id is null);

-- Insert demo batches
insert into batches
  (id, batch_code, batch_name, species, breed, count, status, premises_code, region, created_at, submitted_at, approved_at)
values
  ('a1b2c3d4-0001-0001-0001-000000000001',
   'HRD-2026-MOG-001', 'Daynile Zebu Herd — Aug 2026',
   'CATTLE', 'Somali Zebu', 6, 'TAGGED',
   'SOM-MOG-004', 'Banadir',
   '2026-07-15', '2026-07-16', '2026-07-20'),

  ('a1b2c3d4-0002-0002-0002-000000000002',
   'HRD-2026-BAY-002', 'Baidoa Sheep Flock',
   'SHEEP', 'Somali Blackhead', 4, 'APPROVED',
   'SOM-BAY-011', 'Bay',
   '2026-07-28', '2026-07-29', '2026-08-01'),

  ('a1b2c3d4-0003-0003-0003-000000000003',
   'HRD-2026-KIS-003', 'Kismayo Goat Herd',
   'GOAT', 'Somali', 3, 'UNDER_REVIEW',
   'SOM-JUB-004', 'Lower Juba',
   '2026-08-02', '2026-08-02', null),

  ('a1b2c3d4-0004-0004-0004-000000000004',
   'HRD-2026-MOG-004', 'My Camel Group',
   'CAMEL', 'Somali Dromedary', 2, 'DRAFT',
   'SOM-MOG-007', 'Banadir',
   '2026-08-03', null, null),

  ('a1b2c3d4-0005-0005-0005-000000000005',
   'HRD-2026-JOW-005', 'Jowhar Cattle Batch',
   'CATTLE', 'Somali Zebu', 3, 'REJECTED',
   'SOM-HRS-002', 'Hiraan',
   '2026-07-10', '2026-07-11', null);

-- Insert demo animals for batch HRD-2026-MOG-001 (TAGGED cattle)
insert into animals
  (id, animal_code, batch_id, seq, species, breed, sex, age_months, weight_kg,
   coat_color, coat_pattern, horn_status, body_condition_score,
   submission_type, health_status, vaccination_status,
   tag_serial, tag_type, tag_color, tag_placement, tag_status,
   current_premises_id, status)
values
  ('b1000001-0001-0001-0001-000000000001',
   'SOM-9001000441',
   'a1b2c3d4-0001-0001-0001-000000000001', 1,
   'CATTLE', 'Somali Zebu', 'MALE', 36, 280,
   'White', 'SOLID', 'HORNED', 3,
   'BIRTH', 'HEALTHY', 'VACCINATED',
   'TG-SOM-2026-000441', 'RFID', 'Yellow', 'LEFT_EAR', 'TAGGED',
   'SOM-MOG-004', 'ACTIVE'),

  ('b1000001-0002-0002-0002-000000000002',
   'SOM-9001000442',
   'a1b2c3d4-0001-0001-0001-000000000001', 2,
   'CATTLE', 'Somali Zebu', 'MALE', 42, 310,
   'Brown', 'SOLID', 'HORNED', 4,
   'BIRTH', 'HEALTHY', 'VACCINATED',
   'TG-SOM-2026-000442', 'RFID', 'Yellow', 'LEFT_EAR', 'TAGGED',
   'SOM-MOG-004', 'ACTIVE'),

  ('b1000001-0003-0003-0003-000000000003',
   'SOM-9001000443',
   'a1b2c3d4-0001-0001-0001-000000000001', 3,
   'CATTLE', 'Somali Zebu', 'FEMALE', 28, 245,
   'Black', 'SOLID', 'POLLED', 3,
   'BIRTH', 'HEALTHY', 'VACCINATED',
   'TG-SOM-2026-000443', 'RFID', 'Yellow', 'LEFT_EAR', 'TAGGED',
   'SOM-MOG-004', 'ACTIVE'),

  ('b1000001-0004-0004-0004-000000000004',
   'SOM-9001000444',
   'a1b2c3d4-0001-0001-0001-000000000001', 4,
   'CATTLE', 'Somali Zebu', 'MALE', 30, 265,
   'Tan', 'SOLID', 'HORNED', 3,
   'PURCHASE', 'HEALTHY', 'UNKNOWN',
   'TG-SOM-2026-000444', 'RFID', 'Yellow', 'LEFT_EAR', 'TAGGED',
   'SOM-MOG-004', 'ACTIVE'),

  ('b1000001-0005-0005-0005-000000000005',
   'SOM-9001000445',
   'a1b2c3d4-0001-0001-0001-000000000001', 5,
   'CATTLE', 'Somali Zebu', 'FEMALE', 24, 220,
   'Piebald', 'PIEBALD', 'POLLED', 3,
   'BIRTH', 'HEALTHY', 'VACCINATED',
   'TG-SOM-2026-000445', 'RFID', 'Yellow', 'LEFT_EAR', 'TAGGED',
   'SOM-MOG-004', 'ACTIVE'),

  ('b1000001-0006-0006-0006-000000000006',
   'SOM-9001000446',
   'a1b2c3d4-0001-0001-0001-000000000001', 6,
   'CATTLE', 'Somali Zebu', 'MALE', 48, 340,
   'Dark Brown', 'SOLID', 'HORNED', 4,
   'PURCHASE', 'HEALTHY', 'VACCINATED',
   'TG-SOM-2026-000446', 'RFID', 'Yellow', 'LEFT_EAR', 'TAGGED',
   'SOM-MOG-004', 'ACTIVE');

-- Insert demo animals for batch HRD-2026-BAY-002 (APPROVED sheep, untagged)
insert into animals
  (id, animal_code, batch_id, seq, species, breed, sex, age_months, weight_kg,
   submission_type, health_status, vaccination_status, tag_status,
   current_premises_id, status)
values
  ('b2000001-0001-0001-0001-000000000001', 'SOM-9001000201',
   'a1b2c3d4-0002-0002-0002-000000000002', 1,
   'SHEEP', 'Somali Blackhead', 'MALE', 18, 36,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-BAY-011', 'ACTIVE'),

  ('b2000001-0002-0002-0002-000000000002', 'SOM-9001000202',
   'a1b2c3d4-0002-0002-0002-000000000002', 2,
   'SHEEP', 'Somali Blackhead', 'MALE', 20, 38,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-BAY-011', 'ACTIVE'),

  ('b2000001-0003-0003-0003-000000000003', 'SOM-9001000203',
   'a1b2c3d4-0002-0002-0002-000000000002', 3,
   'SHEEP', 'Somali Blackhead', 'FEMALE', 16, 30,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-BAY-011', 'ACTIVE'),

  ('b2000001-0004-0004-0004-000000000004', 'SOM-9001000204',
   'a1b2c3d4-0002-0002-0002-000000000002', 4,
   'SHEEP', 'Somali Blackhead', 'FEMALE', 15, 28,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-BAY-011', 'ACTIVE');

-- Insert demo animals for batch HRD-2026-KIS-003 (goats, under review)
insert into animals
  (id, animal_code, batch_id, seq, species, breed, sex, age_months, weight_kg,
   submission_type, health_status, vaccination_status, tag_status,
   current_premises_id, status)
values
  ('b3000001-0001-0001-0001-000000000001', 'SOM-9001000301',
   'a1b2c3d4-0003-0003-0003-000000000003', 1,
   'GOAT', 'Somali', 'MALE', 24, 42,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-JUB-004', 'SUBMITTED'),

  ('b3000001-0002-0002-0002-000000000002', 'SOM-9001000302',
   'a1b2c3d4-0003-0003-0003-000000000003', 2,
   'GOAT', 'Somali', 'FEMALE', 18, 32,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-JUB-004', 'SUBMITTED'),

  ('b3000001-0003-0003-0003-000000000003', 'SOM-9001000303',
   'a1b2c3d4-0003-0003-0003-000000000003', 3,
   'GOAT', 'Somali', 'FEMALE', 20, 35,
   'BIRTH', 'HEALTHY', 'UNKNOWN', 'UNTAGGED', 'SOM-JUB-004', 'SUBMITTED');

-- Insert demo animals for batch HRD-2026-MOG-004 (camels, draft)
insert into animals
  (id, animal_code, batch_id, seq, species, breed, sex, age_months, weight_kg,
   coat_color, submission_type, health_status, vaccination_status, tag_status,
   current_premises_id, status)
values
  ('b4000001-0001-0001-0001-000000000001', 'SOM-9001000401',
   'a1b2c3d4-0004-0004-0004-000000000004', 1,
   'CAMEL', 'Somali Dromedary', 'MALE', 60, 450,
   'Dark Brown', 'PURCHASE', 'HEALTHY', 'UNKNOWN', 'UNTAGGED',
   'SOM-MOG-007', 'DRAFT'),

  ('b4000001-0002-0002-0002-000000000002', 'SOM-9001000402',
   'a1b2c3d4-0004-0004-0004-000000000004', 2,
   'CAMEL', 'Somali Dromedary', 'FEMALE', 48, 380,
   'Cream', 'PURCHASE', 'HEALTHY', 'UNKNOWN', 'UNTAGGED',
   'SOM-MOG-007', 'DRAFT');

-- ── End of migration ──────────────────────────────────────────────────────────
