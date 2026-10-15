-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Add missing district column to farmers table
-- Run this in Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

alter table farmers
  add column if not exists district text;
