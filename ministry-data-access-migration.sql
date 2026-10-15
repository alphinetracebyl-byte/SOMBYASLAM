-- ══════════════════════════════════════════════════════════════════════════════
-- SOMLITS — Ministry Data Access Fix
-- Run in Supabase SQL Editor.
-- Grants authenticated (ministry) users read-all access to farmer data tables.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. farmer_premises ────────────────────────────────────────────────────────
-- The existing anon_read_premises only covers the anon role.
-- Ministry users are authenticated after login, so they need their own policy.

DROP POLICY IF EXISTS "authenticated_read_all_premises" ON farmer_premises;
CREATE POLICY "authenticated_read_all_premises"
  ON farmer_premises FOR SELECT
  TO authenticated
  USING (true);

-- ── 2. farmer_movement_requests ───────────────────────────────────────────────
-- The existing anon_read_movements only covers the anon role.

DROP POLICY IF EXISTS "authenticated_read_all_movements" ON farmer_movement_requests;
CREATE POLICY "authenticated_read_all_movements"
  ON farmer_movement_requests FOR SELECT
  TO authenticated
  USING (true);

-- ── 3. batches ────────────────────────────────────────────────────────────────
-- Currently only farmers can read their own batches (owner_id = auth.uid()).
-- Add a permissive policy so authenticated users can read all batches.

DROP POLICY IF EXISTS "authenticated_read_all_batches" ON batches;
CREATE POLICY "authenticated_read_all_batches"
  ON batches FOR SELECT
  TO authenticated
  USING (true);

-- ── 4. animals ────────────────────────────────────────────────────────────────
-- Currently only farmers can read their own animals (current_owner_id = auth.uid()).
-- Add a permissive policy so authenticated users can read all animals.

DROP POLICY IF EXISTS "authenticated_read_all_animals" ON animals;
CREATE POLICY "authenticated_read_all_animals"
  ON animals FOR SELECT
  TO authenticated
  USING (true);

-- ── 5. animal_photos ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "authenticated_read_all_photos" ON animal_photos;
CREATE POLICY "authenticated_read_all_photos"
  ON animal_photos FOR SELECT
  TO authenticated
  USING (true);

-- ── 6. farmer_animals view ───────────────────────────────────────────────────
-- The ministry analytics and map pages query `farmer_animals` with renamed
-- columns (gender, date_of_birth, animal_tag_id, premises_code).
-- Create this view mapping from the canonical animals table column names.

DROP VIEW IF EXISTS farmer_animals;
CREATE VIEW farmer_animals AS
  SELECT
    a.id,
    a.animal_code            AS animal_tag_id,
    a.species,
    a.breed,
    a.sex                    AS gender,
    a.status,
    a.dob                    AS date_of_birth,
    a.age_months,
    a.weight_kg,
    a.tag_serial,
    a.tag_type,
    a.tag_color,
    a.tag_status,
    a.health_status,
    a.coat_color,
    a.current_premises_id    AS premises_code,
    a.current_owner_id,
    a.batch_id,
    a.registered_at,
    a.created_at
  FROM animals a;

-- Grant SELECT to all roles (RLS on underlying animals table now allows authenticated read)
GRANT SELECT ON farmer_animals TO anon, authenticated;

-- ── 7. farmers table ─────────────────────────────────────────────────────────
-- The farmers table is already accessed via security-definer RPCs (get_all_farmers).
-- But in case direct queries are needed, add a read-all policy here too.

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'farmers') THEN
    EXECUTE $sql$
      DROP POLICY IF EXISTS "authenticated_read_all_farmers" ON farmers;
      CREATE POLICY "authenticated_read_all_farmers"
        ON farmers FOR SELECT
        TO authenticated
        USING (true);
    $sql$;
  END IF;
END;
$$;
