-- ══════════════════════════════════════════════════════════════════
-- Ministry portal: RPC functions that bypass RLS / permission issues
-- Run this in Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Returns all farmers (optionally filtered by status and/or region)
create or replace function get_all_farmers(
  p_status text default null,
  p_region text default null
)
returns setof farmers
language sql
security definer
stable
as $$
  select * from farmers
  where
    (p_status is null or p_status = 'ALL' or status = p_status)
    and
    (p_region is null or p_region = 'ALL' or p_region = 'NATIONAL' or region = p_region)
  order by created_at desc;
$$;

-- Returns status counts
create or replace function get_farmers_status_counts()
returns table(status text, cnt bigint)
language sql
security definer
stable
as $$
  select status, count(*) as cnt
  from farmers
  group by status;
$$;

-- Returns a single farmer by id
create or replace function get_farmer_by_id(p_id uuid)
returns setof farmers
language sql
security definer
stable
as $$
  select * from farmers where id = p_id limit 1;
$$;

-- Update farmer status (approve / reject / suspend / reinstate)
create or replace function update_farmer_status(
  p_id               uuid,
  p_status           text,
  p_rejection_reason text default null,
  p_approved_by      text default null
)
returns void
language sql
security definer
as $$
  update farmers set
    status           = p_status,
    rejection_reason = p_rejection_reason,
    approved_at      = case when p_status = 'APPROVED' then now() else null end,
    approved_by      = p_approved_by,
    updated_at       = now()
  where id = p_id;
$$;

-- Update farmer profile fields
create or replace function update_farmer_fields(
  p_id         uuid,
  p_patch      jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  update farmers set
    full_name    = coalesce((p_patch->>'full_name'),    full_name),
    date_of_birth= coalesce((p_patch->>'date_of_birth')::date, date_of_birth),
    gender       = coalesce((p_patch->>'gender'),       gender),
    region       = coalesce((p_patch->>'region'),       region),
    village      = coalesce((p_patch->>'village'),      village),
    phone_e164   = coalesce((p_patch->>'phone_e164'),   phone_e164),
    alt_phone    = coalesce((p_patch->>'alt_phone'),    alt_phone),
    email        = coalesce((p_patch->>'email'),        email),
    national_id  = coalesce((p_patch->>'national_id'),  national_id),
    id_type      = coalesce((p_patch->>'id_type'),      id_type),
    updated_at   = now()
  where id = p_id;
end;
$$;

-- Farmer premises (joins farmer_premises via farmers.user_id)
create or replace function get_farmer_premises(p_farmer_id uuid)
returns table(
  id uuid, premises_code text, name text,
  premises_type text, region text, district text, status text
)
language sql security definer stable as $$
  select fp.id, fp.premises_code, fp.premises_name as name,
         fp.premises_type, fp.region_code as region, '' as district, fp.status
  from farmer_premises fp
  join farmers f on f.user_id = fp.user_id
  where f.id = p_farmer_id
  order by fp.created_at desc;
$$;

-- Premises by region (for field inspector) — includes species counts from batches
create or replace function get_premises_by_region(p_region_code text)
returns table(
  id uuid, premises_code text, premises_name text, premises_type text,
  status text, region_code text, gps_latitude numeric, gps_longitude numeric,
  owner_name text, owner_phone text,
  cattle_count bigint, camel_count bigint, sheep_count bigint, goat_count bigint
)
language sql security definer stable as $$
  select
    fp.id, fp.premises_code, fp.premises_name, fp.premises_type,
    fp.status, fp.region_code, fp.gps_latitude, fp.gps_longitude,
    f.full_name  as owner_name,
    f.phone_e164 as owner_phone,
    coalesce(sum(case when b.species ilike 'Cattle' then b.count else 0 end), 0) as cattle_count,
    coalesce(sum(case when b.species ilike 'Camel'  then b.count else 0 end), 0) as camel_count,
    coalesce(sum(case when b.species ilike 'Sheep'  then b.count else 0 end), 0) as sheep_count,
    coalesce(sum(case when b.species ilike 'Goat'   then b.count else 0 end), 0) as goat_count
  from farmer_premises fp
  left join farmers f on f.user_id = fp.user_id
  left join batches b on b.premises_code = fp.premises_code
  where fp.region_code = p_region_code
  group by fp.id, fp.premises_code, fp.premises_name, fp.premises_type,
           fp.status, fp.region_code, fp.gps_latitude, fp.gps_longitude,
           f.full_name, f.phone_e164
  order by fp.created_at desc;
$$;

-- Batches by premises code (for field inspector)
create or replace function get_batches_by_premises_code(p_premises_code text)
returns table(
  id uuid, batch_code text, batch_name text, species text,
  breed text, count int, status text, created_at timestamptz
)
language sql security definer stable as $$
  select id, batch_code, batch_name, species, breed, count, status, created_at
  from batches
  where premises_code = p_premises_code
  order by created_at desc;
$$;

-- Animals by batch (for field inspector)
create or replace function get_animals_by_batch(p_batch_id uuid)
returns table(
  id uuid, seq int, sex text, age_months int, weight_kg numeric,
  distinguishing_marks text, animal_code text, tag_serial text,
  tag_type text, tag_color text, tag_status text
)
language sql security definer stable as $$
  select id, seq, sex, age_months, weight_kg, distinguishing_marks,
         animal_code, tag_serial, tag_type, tag_color, tag_status
  from animals
  where batch_id = p_batch_id
  order by seq;
$$;

-- Farmer animals (joined through batches.owner_id → farmers.user_id)
create or replace function get_farmer_animals(p_farmer_id uuid)
returns table(
  id uuid, tag_number text, species text,
  breed text, sex text, status text, created_at timestamptz
)
language sql security definer stable as $$
  select a.id, a.tag_serial as tag_number, b.species, a.breed,
         a.sex, a.tag_status as status, a.created_at
  from animals a
  join batches b on b.id = a.batch_id
  join farmers f on f.user_id = b.owner_id::uuid
  where f.id = p_farmer_id
  order by a.created_at desc
  limit 50;
$$;

-- Farmer export certificates (table not yet built — returns empty)
create or replace function get_farmer_exports(p_farmer_id uuid)
returns table(
  id uuid, cert_number text, destination_country text,
  animal_count int, species text, export_date date, status text
)
language sql security definer stable as $$
  select
    null::uuid, null::text, null::text,
    null::int,  null::text, null::date, null::text
  where false;
$$;

-- Premises batches (by premises UUID, joins to farmer_premises for code)
create or replace function get_premises_batches(p_premises_id uuid)
returns table(
  id uuid, batch_code text, batch_name text,
  species text, breed text, animal_count int, status text, batch_date timestamptz
)
language sql security definer stable as $$
  select b.id, b.batch_code, b.batch_name,
         b.species, b.breed, b.count as animal_count, b.status, b.created_at as batch_date
  from batches b
  join farmer_premises fp on fp.premises_code = b.premises_code
  where fp.id = p_premises_id
  order by b.created_at desc;
$$;

-- Batch animals
create or replace function get_batch_animals(p_batch_id uuid)
returns table(
  id uuid, seq int, sex text, age_months int, weight_kg numeric,
  distinguishing_marks text, animal_code text,
  tag_serial text, tag_type text, tag_color text, tag_status text
)
language sql security definer stable as $$
  select id, seq, sex, age_months, weight_kg, distinguishing_marks,
         animal_code, tag_serial, tag_type, tag_color, tag_status
  from animals
  where batch_id = p_batch_id
  order by seq;
$$;

-- Farmer documents (table not yet built — returns empty)
create or replace function get_farmer_documents(p_farmer_id uuid)
returns table(
  id uuid, farmer_id uuid, document_type text,
  label text, file_url text, uploaded_by text, uploaded_at timestamptz
)
language sql security definer stable as $$
  select
    null::uuid, null::uuid, null::text,
    null::text, null::text, null::text, null::timestamptz
  where false;
$$;

-- Grant execute to anon and authenticated
grant execute on function get_all_farmers(text, text)         to anon, authenticated;
grant execute on function get_farmers_status_counts()         to anon, authenticated;
grant execute on function get_farmer_by_id(uuid)              to anon, authenticated;
grant execute on function update_farmer_status(uuid,text,text,text) to anon, authenticated;
grant execute on function update_farmer_fields(uuid, jsonb)   to anon, authenticated;
grant execute on function get_farmer_premises(uuid)                   to anon, authenticated;
grant execute on function get_farmer_animals(uuid)                    to anon, authenticated;
grant execute on function get_farmer_exports(uuid)                    to anon, authenticated;
grant execute on function get_premises_batches(uuid)                  to anon, authenticated;
grant execute on function get_batch_animals(uuid)                     to anon, authenticated;
grant execute on function get_farmer_documents(uuid)                  to anon, authenticated;
grant execute on function get_premises_by_region(text)                to anon, authenticated;
grant execute on function get_batches_by_premises_code(text)          to anon, authenticated;
grant execute on function get_animals_by_batch(uuid)                  to anon, authenticated;
