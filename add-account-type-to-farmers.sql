-- ══════════════════════════════════════════════════════════════════
-- SOMLITS — Add account type and company detail columns to farmers
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

alter table farmers
  add column if not exists account_type     text not null default 'INDIVIDUAL'
    check (account_type in ('INDIVIDUAL', 'COMPANY')),
  add column if not exists company_name     text,
  add column if not exists license_number   text,
  add column if not exists company_address  text,
  add column if not exists license_url      text,
  add column if not exists addr_proof_url   text;
