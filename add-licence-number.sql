-- add-licence-number.sql
-- Adds professional licence_number to user_registrations for vet officers and field inspectors.
-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE user_registrations
  ADD COLUMN IF NOT EXISTS licence_number TEXT;

COMMENT ON COLUMN user_registrations.licence_number IS
  'Professional veterinary or inspector licence number issued by the Director of Veterinary Services. '
  'Required for VETERINARY_OFFICER; optional for FIELD_INSPECTOR.';

-- Anon SELECT policy so the field portal can read officer licence numbers when issuing permits
DROP POLICY IF EXISTS ureg_licence_anon_sel ON user_registrations;
CREATE POLICY ureg_licence_anon_sel ON user_registrations
  FOR SELECT TO anon USING (true);
