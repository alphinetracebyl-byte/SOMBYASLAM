-- ─────────────────────────────────────────────────────────────────────────────
-- SOMLITS ID Generation System
-- Run this in Supabase SQL Editor (or include in your migration pipeline)
--
-- Provides:
--   - Atomic per-entity-per-region sequence counters
--   - Luhn Mod-10 check digit
--   - Generator functions for PRM / BAT / TRQ / MOV / TAL
--   - Validator function for any SOMLITS ID
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Sequence counter table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS somlits_id_sequences (
  entity_type  VARCHAR(6)  NOT NULL,          -- PRM | BAT | TRQ | MOV | TAL
  region_code  VARCHAR(10) NOT NULL,           -- MUD | BAN | AWD … or NAT
  year         SMALLINT    NOT NULL DEFAULT 0, -- 0 = timeless (Premises)
  last_seq     BIGINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_type, region_code, year)
);

COMMENT ON TABLE somlits_id_sequences IS
  'Atomic sequence counters for SOMLITS formatted IDs. Never delete rows.';

-- RLS is enabled by Supabase by default; the functions use SECURITY DEFINER
-- to write to this table as the owner, so no app-level policy is needed.
ALTER TABLE somlits_id_sequences ENABLE ROW LEVEL SECURITY;


-- ── 2. Luhn Mod-10 check digit ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION somlits_luhn_check(p_digits TEXT)
RETURNS CHAR AS $$
DECLARE
  v_digits TEXT;
  v_sum    INTEGER := 0;
  v_n      INTEGER;
  v_i      INTEGER;
BEGIN
  v_digits := regexp_replace(p_digits, '[^0-9]', '', 'g');
  FOR v_i IN REVERSE length(v_digits)..1 LOOP
    v_n := substring(v_digits FROM v_i FOR 1)::INTEGER;
    IF (length(v_digits) - v_i + 1) % 2 = 0 THEN
      v_n := v_n * 2;
      IF v_n > 9 THEN v_n := v_n - 9; END IF;
    END IF;
    v_sum := v_sum + v_n;
  END LOOP;
  RETURN ((10 - (v_sum % 10)) % 10)::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ── 3. Atomic sequence increment ──────────────────────────────────────────────
-- SECURITY DEFINER: runs as the function owner (postgres), bypassing RLS on
-- somlits_id_sequences so app-role callers can increment sequences safely.
CREATE OR REPLACE FUNCTION somlits_next_seq(
  p_entity VARCHAR(6),
  p_region VARCHAR(10),
  p_year   SMALLINT DEFAULT 0
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  INSERT INTO somlits_id_sequences (entity_type, region_code, year, last_seq)
  VALUES (p_entity, p_region, p_year, 1)
  ON CONFLICT (entity_type, region_code, year)
  DO UPDATE SET last_seq = somlits_id_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN v_seq;
END;
$$;


-- ── 4. Premises ID ────────────────────────────────────────────────────────────
-- Format: SO-PRM-[REG]-[SEQ6]-[C]
-- Example: SO-PRM-MUD-000001-7
CREATE OR REPLACE FUNCTION generate_premises_id(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq    BIGINT;
  v_seq_s  TEXT;
  v_digits TEXT;
  v_check  CHAR;
BEGIN
  v_seq    := somlits_next_seq('PRM', upper(p_region_code));
  v_seq_s  := lpad(v_seq::TEXT, 6, '0');
  v_digits := regexp_replace(upper(p_region_code), '[^0-9]', '', 'g') || v_seq_s;
  v_check  := somlits_luhn_check(v_digits);
  RETURN 'SO-PRM-' || upper(p_region_code) || '-' || v_seq_s || '-' || v_check;
END;
$$;


-- ── 5. Batch ID ───────────────────────────────────────────────────────────────
-- Format: SO-BAT-[YYYY]-[REG]-[SEQ6]-[C]
-- Example: SO-BAT-2026-MUD-000001-3
CREATE OR REPLACE FUNCTION generate_batch_id(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year   SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_seq    BIGINT;
  v_seq_s  TEXT;
  v_digits TEXT;
  v_check  CHAR;
BEGIN
  v_seq    := somlits_next_seq('BAT', upper(p_region_code), v_year);
  v_seq_s  := lpad(v_seq::TEXT, 6, '0');
  v_digits := v_year::TEXT || regexp_replace(upper(p_region_code), '[^0-9]', '', 'g') || v_seq_s;
  v_check  := somlits_luhn_check(v_digits);
  RETURN 'SO-BAT-' || v_year::TEXT || '-' || upper(p_region_code) || '-' || v_seq_s || '-' || v_check;
END;
$$;


-- ── 6. Tag Request ID ─────────────────────────────────────────────────────────
-- Format: SO-TRQ-[YYYY]-[REG]-[SEQ5]-[C]
-- Example: SO-TRQ-2026-MUD-00001-9
CREATE OR REPLACE FUNCTION generate_tag_request_id(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year   SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_seq    BIGINT;
  v_seq_s  TEXT;
  v_digits TEXT;
  v_check  CHAR;
BEGIN
  v_seq    := somlits_next_seq('TRQ', upper(p_region_code), v_year);
  v_seq_s  := lpad(v_seq::TEXT, 5, '0');
  v_digits := v_year::TEXT || regexp_replace(upper(p_region_code), '[^0-9]', '', 'g') || v_seq_s;
  v_check  := somlits_luhn_check(v_digits);
  RETURN 'SO-TRQ-' || v_year::TEXT || '-' || upper(p_region_code) || '-' || v_seq_s || '-' || v_check;
END;
$$;


-- ── 7. Tag Allocation ID ──────────────────────────────────────────────────────
-- Format: SO-TAL-[YYYY]-[REG]-[SEQ5]-[C]
-- Example: SO-TAL-2026-MUD-00001-4
CREATE OR REPLACE FUNCTION generate_tag_allocation_id(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year   SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_seq    BIGINT;
  v_seq_s  TEXT;
  v_digits TEXT;
  v_check  CHAR;
BEGIN
  v_seq    := somlits_next_seq('TAL', upper(p_region_code), v_year);
  v_seq_s  := lpad(v_seq::TEXT, 5, '0');
  v_digits := v_year::TEXT || regexp_replace(upper(p_region_code), '[^0-9]', '', 'g') || v_seq_s;
  v_check  := somlits_luhn_check(v_digits);
  RETURN 'SO-TAL-' || v_year::TEXT || '-' || upper(p_region_code) || '-' || v_seq_s || '-' || v_check;
END;
$$;


-- ── 8. Movement ID ────────────────────────────────────────────────────────────
-- Format: SO-MOV-[YYYY]-[REG]-[SEQ6]-[C]
-- Example: SO-MOV-2026-MUD-000001-5
CREATE OR REPLACE FUNCTION generate_movement_id(p_region_code VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year   SMALLINT := EXTRACT(YEAR FROM NOW())::SMALLINT;
  v_seq    BIGINT;
  v_seq_s  TEXT;
  v_digits TEXT;
  v_check  CHAR;
BEGIN
  v_seq    := somlits_next_seq('MOV', upper(p_region_code), v_year);
  v_seq_s  := lpad(v_seq::TEXT, 6, '0');
  v_digits := v_year::TEXT || regexp_replace(upper(p_region_code), '[^0-9]', '', 'g') || v_seq_s;
  v_check  := somlits_luhn_check(v_digits);
  RETURN 'SO-MOV-' || v_year::TEXT || '-' || upper(p_region_code) || '-' || v_seq_s || '-' || v_check;
END;
$$;


-- ── 9. Validator (any SOMLITS ID) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_somlits_id(p_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_parts  TEXT[];
  v_check  TEXT;
  v_body   TEXT;
  v_digits TEXT;
BEGIN
  v_parts := string_to_array(upper(trim(p_id)), '-');
  IF array_length(v_parts, 1) < 4       THEN RETURN FALSE; END IF;
  IF v_parts[1] <> 'SO'                 THEN RETURN FALSE; END IF;
  v_check  := v_parts[array_length(v_parts, 1)];
  v_body   := array_to_string(v_parts[2:array_length(v_parts, 1) - 1], '-');
  v_digits := regexp_replace(v_body, '[^0-9]', '', 'g');
  RETURN somlits_luhn_check(v_digits) = v_check;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ── 10. Grant EXECUTE to app roles ───────────────────────────────────────────
-- Allows authenticated (and anon) users to call the generator functions via
-- supabase.rpc(). The SECURITY DEFINER above ensures they cannot touch the
-- sequences table directly.
GRANT EXECUTE ON FUNCTION generate_premises_id(VARCHAR)       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_batch_id(VARCHAR)          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_tag_request_id(VARCHAR)    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_tag_allocation_id(VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_movement_id(VARCHAR)       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_somlits_id(VARCHAR)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION somlits_luhn_check(TEXT)            TO authenticated, anon;


-- ── 11. Schema fixes ─────────────────────────────────────────────────────────
ALTER TABLE farmer_tag_requests
  ADD COLUMN IF NOT EXISTS request_code VARCHAR(40);

-- Remove district_code — region_code is sufficient for SOMLITS
ALTER TABLE farmer_premises DROP COLUMN IF EXISTS district_code;

-- Drop the old trigger that overwrote premises_code with SOM-REG-NNN format
-- (premises_code is now provided by generate_premises_id() before insert)
DROP TRIGGER IF EXISTS trg_farmer_premises_code ON farmer_premises;
DROP FUNCTION IF EXISTS set_farmer_premises_code();


-- ── 12. Quick test ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_prm TEXT := generate_premises_id('MUD');
  v_bat TEXT := generate_batch_id('MUD');
  v_trq TEXT := generate_tag_request_id('MUD');
  v_mov TEXT := generate_movement_id('BAR');
BEGIN
  RAISE NOTICE 'Premises  ID : %  valid=%', v_prm, validate_somlits_id(v_prm);
  RAISE NOTICE 'Batch     ID : %  valid=%', v_bat, validate_somlits_id(v_bat);
  RAISE NOTICE 'TagRequest ID: %  valid=%', v_trq, validate_somlits_id(v_trq);
  RAISE NOTICE 'Movement  ID : %  valid=%', v_mov, validate_somlits_id(v_mov);
END $$;
