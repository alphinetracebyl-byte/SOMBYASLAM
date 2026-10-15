-- ── Ministry Regions ─────────────────────────────────────────────────────────
-- Owned by Ministry of Livestock. Active flag lets them deactivate a region
-- without deleting records that reference it.

create table if not exists ministry_regions (
  id         uuid        primary key default gen_random_uuid(),
  code       text        not null unique,
  name       text        not null,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

-- Enable RLS — public read, ministry-role write (adjust policy to your auth setup)
alter table ministry_regions enable row level security;

create policy "Anyone can read active regions"
  on ministry_regions for select
  using (active = true);

-- Seed: Somalia's 18 administrative regions
insert into ministry_regions (code, name) values
  ('AWD', 'Awdal'),
  ('BAK', 'Bakool'),
  ('BAN', 'Banadir'),
  ('BAR', 'Bari'),
  ('BAY', 'Bay'),
  ('GAL', 'Galgaduud'),
  ('GED', 'Gedo'),
  ('HIR', 'Hiraan'),
  ('LJU', 'Lower Juba'),
  ('LSH', 'Lower Shabelle'),
  ('MJU', 'Middle Juba'),
  ('MSH', 'Middle Shabelle'),
  ('MUD', 'Mudug'),
  ('NUG', 'Nugaal'),
  ('SAN', 'Sanaag'),
  ('SOL', 'Sool'),
  ('TOG', 'Togdheer'),
  ('WOG', 'Woqooyi Galbeed')
on conflict (code) do nothing;
