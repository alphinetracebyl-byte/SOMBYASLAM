-- Movement Tasks table
-- Run this in your Supabase SQL editor

create table if not exists movement_tasks (
  id                        uuid primary key default gen_random_uuid(),
  movement_code             text not null,
  region_code               text not null,
  task_role                 text not null,   -- 'VETERINARY_OFFICER' | 'FIELD_INSPECTOR'
  status                    text not null default 'PENDING',  -- PENDING | APPROVED | REJECTED | INFO_REQUESTED
  origin_premises_code      text,
  origin_premises_name      text,
  destination_premises_code text,
  destination_premises_name text,
  animal_count              integer,
  movement_type_code        text,
  purpose                   text,
  planned_departure_date    text,
  planned_arrival_date      text,
  vehicle_registration      text,
  transporter_name          text,
  species_notes             text,
  reviewer_notes            text,
  reviewed_at               timestamptz,
  created_at                timestamptz default now()
);

-- Index for fast lookups by region + role
create index if not exists idx_movement_tasks_region_role
  on movement_tasks (region_code, task_role, status);

-- Index for checking if all tasks for a movement are approved
create index if not exists idx_movement_tasks_movement_code
  on movement_tasks (movement_code);

-- RLS
alter table movement_tasks enable row level security;

create policy "Authenticated users can insert movement tasks"
  on movement_tasks for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can read movement tasks"
  on movement_tasks for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can update movement tasks"
  on movement_tasks for update
  using (auth.role() = 'authenticated');
