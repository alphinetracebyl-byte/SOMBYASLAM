-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Farmer Registration Table
-- Run this in Supabase SQL Editor (after supabase-schema.sql)
-- ══════════════════════════════════════════════════════════════════

drop table if exists farmers cascade;
drop sequence if exists farmer_seq;

-- ── Auto-incrementing code sequence ───────────────────────────────
create sequence farmer_seq start 1;

-- ── Farmers table ─────────────────────────────────────────────────
create table farmers (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id),
  farmer_code      text unique,
  full_name        text not null,
  date_of_birth    date,
  gender           text,
  phone_e164       text not null unique,
  alt_phone        text,
  email            text,
  national_id      text not null unique,
  id_type          text not null,
  region           text not null,
  district         text not null,
  village          text,
  gps_lat          numeric,
  gps_lng          numeric,
  photo_url        text,
  id_front_url     text,
  id_back_url      text,
  status           text not null default 'PENDING',
  rejection_reason text,
  approved_at      timestamptz,
  approved_by      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Auto-generate farmer_code on insert ───────────────────────────
create or replace function set_farmer_code()
returns trigger as $$
begin
  new.farmer_code := 'FRM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('farmer_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger trg_farmer_code
  before insert on farmers
  for each row
  when (new.farmer_code is null)
  execute function set_farmer_code();

-- ── Auto-update updated_at ────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_farmers_updated_at
  before update on farmers
  for each row execute function touch_updated_at();

-- ── Disable RLS (ministry portal needs full read access) ─────────
alter table farmers disable row level security;

-- ── Grant access to anon and authenticated roles ──────────────────
grant select, insert, update on farmers to anon;
grant select, insert, update on farmers to authenticated;
grant usage, select on sequence farmer_seq to anon;
grant usage, select on sequence farmer_seq to authenticated;

-- ── Useful indexes ────────────────────────────────────────────────
create index idx_farmers_phone      on farmers(phone_e164);
create index idx_farmers_national_id on farmers(national_id);
create index idx_farmers_status     on farmers(status);
create index idx_farmers_region     on farmers(region);
