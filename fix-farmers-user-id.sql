-- ══════════════════════════════════════════════════════════════════
-- FIX: Add missing user_id column to farmers table
-- Run this in Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. Add user_id column (links farmer profile to Supabase auth user)
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Grant read/write access so the anon key can insert and the
--    ministry portal can read (RLS is disabled on this table)
GRANT SELECT, INSERT, UPDATE ON farmers TO anon;
GRANT SELECT, INSERT, UPDATE ON farmers TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE farmer_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE farmer_seq TO authenticated;
