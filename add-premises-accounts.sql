-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Premises representative sub-accounts
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

create table if not exists premises_accounts (
  id                  uuid primary key default gen_random_uuid(),
  premises_id         uuid not null,
  premises_code       text not null,
  farmer_id           uuid not null references farmers(id) on delete cascade,
  user_id             uuid unique references auth.users(id) on delete set null,
  representative_name text not null,
  email               text not null unique,
  status              text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (premises_id)   -- one representative account per premises
);

create index if not exists premises_accounts_farmer_idx   on premises_accounts(farmer_id);
create index if not exists premises_accounts_user_idx     on premises_accounts(user_id);
create index if not exists premises_accounts_premises_idx on premises_accounts(premises_id);

-- ── Row Level Security ───────────────────────────────────────────
alter table premises_accounts enable row level security;

-- Main farmer can read all their premises accounts
create policy "pa_farmer_select" on premises_accounts
  for select using (
    farmer_id in (select id from farmers where user_id = auth.uid())
    or user_id = auth.uid()
  );

-- Main farmer can create premises accounts for their premises
create policy "pa_farmer_insert" on premises_accounts
  for insert with check (
    farmer_id in (select id from farmers where user_id = auth.uid())
  );

-- Main farmer can update/deactivate premises accounts they own
create policy "pa_farmer_update" on premises_accounts
  for update using (
    farmer_id in (select id from farmers where user_id = auth.uid())
  );

-- Main farmer can delete premises accounts they own
create policy "pa_farmer_delete" on premises_accounts
  for delete using (
    farmer_id in (select id from farmers where user_id = auth.uid())
  );
