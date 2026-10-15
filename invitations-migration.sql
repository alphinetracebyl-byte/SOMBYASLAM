-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

create table if not exists user_registrations (
  id               uuid        primary key default gen_random_uuid(),

  -- Personal information
  full_name        text,
  email            text        not null,
  phone            text,
  alt_phone        text,
  id_number        text,

  -- Role & assignment
  role             text        not null,
  territory_type   text,
  region_code      text,
  position_title   text,
  department       text,
  start_date       date        default current_date,

  -- Office details
  office_id        text,
  office_name      text,
  office_location  text,

  -- Administrative
  notes            text,
  status           text        not null default 'PENDING',
  registered_by    text,
  registered_by_id text,
  created_at       timestamptz not null default now()
);

-- Indexes
create index if not exists idx_user_registrations_email  on user_registrations (email);
create index if not exists idx_user_registrations_status on user_registrations (status);
create index if not exists idx_user_registrations_role   on user_registrations (role);

-- RLS
alter table user_registrations enable row level security;

create policy "Authenticated users can read registrations"
  on user_registrations for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert registrations"
  on user_registrations for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update registrations"
  on user_registrations for update
  using (auth.role() = 'authenticated');

-- ── If table already exists, run these to add new columns ──────────────────
alter table user_registrations add column if not exists office_id   text;
alter table user_registrations alter column start_date set default current_date;
