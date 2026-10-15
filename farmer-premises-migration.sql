-- ══════════════════════════════════════════════════════════════
-- SOMLITS — farmer_premises table
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Drop if re-running
drop table if exists farmer_premises cascade;

-- Main table
create table farmer_premises (
  id                   uuid default gen_random_uuid() primary key,
  premises_code        text not null unique,
  user_id              uuid references auth.users(id) on delete cascade,
  premises_name        text not null,
  premises_type        text not null default 'FARM',
  status               text not null default 'SUBMITTED',
  region_code          text not null,
  physical_address     text not null,
  gps_latitude         numeric,
  gps_longitude        numeric,
  area_hectares        numeric,
  capacity_animals     integer,
  allowed_species      text,
  license_number       text,
  license_expiry_date  date,
  is_temporary         boolean not null default false,
  temporary_end_date   date,
  notes                text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
-- premises_code is provided by the caller via generate_premises_id() RPC

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_farmer_premises_updated
before update on farmer_premises
for each row
execute function set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────

alter table farmer_premises enable row level security;

-- Authenticated farmers can read and manage only their own premises
create policy "farmer_own_premises"
  on farmer_premises for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ministry portal (anon key) can read all premises
create policy "anon_read_premises"
  on farmer_premises for select
  to anon
  using (true);
