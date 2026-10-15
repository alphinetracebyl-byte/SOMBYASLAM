-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Activity Log Table
-- Run this in Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

create table if not exists activity_log (
  id             uuid        default gen_random_uuid() primary key,
  portal         text        not null,
  category       text        not null,
  level          text        not null,
  title          text        not null,
  detail         text,
  actor_name     text,
  actor_role     text,
  region         text,
  reference_code text,
  user_id        uuid,
  farmer_id      uuid,
  created_at     timestamptz default now()
);

create index if not exists idx_activity_log_farmer_id  on activity_log(farmer_id);
create index if not exists idx_activity_log_created_at on activity_log(created_at desc);
create index if not exists idx_activity_log_category   on activity_log(category);

alter table activity_log disable row level security;

grant select, insert on activity_log to anon, authenticated;
