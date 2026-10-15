BEGIN;

-- ── Action Messages table (fresh install) ─────────────────────────────────────
-- User-ID columns are TEXT (not UUID) so dev IDs like "dev-ministry-001" work
-- alongside real Supabase UUIDs without FK or type errors.

CREATE TABLE IF NOT EXISTS action_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_code  text        NOT NULL UNIQUE,

  from_user_id   text        NOT NULL DEFAULT '',
  from_user_name text        NOT NULL DEFAULT '',
  from_role      text        NOT NULL DEFAULT '',
  from_region    text,

  -- NULL to_user_id = role broadcast
  to_user_id    text,
  to_user_name  text,
  to_role       text,
  to_region     text,

  subject       text        NOT NULL,
  body          text        NOT NULL,
  priority      text        NOT NULL DEFAULT 'NORMAL'
                              CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),

  ref_type      text,
  ref_code      text,

  status             text        NOT NULL DEFAULT 'UNREAD'
                                   CHECK (status IN ('UNREAD','READ','RESPONDED','CLOSED')),
  response_body      text,
  responded_by_id    text,
  responded_by_name  text,
  responded_at       timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Migrate existing table (adds missing columns, safe to re-run) ─────────────

-- Rename from_name → from_user_name if old schema exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'action_messages' AND column_name = 'from_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'action_messages' AND column_name = 'from_user_name'
  ) THEN
    ALTER TABLE action_messages RENAME COLUMN from_name TO from_user_name;
  END IF;
END $$;

-- Drop existing policies before altering column types (policies block ALTER TYPE)
DROP POLICY IF EXISTS am_select ON action_messages;
DROP POLICY IF EXISTS am_insert ON action_messages;
DROP POLICY IF EXISTS am_update ON action_messages;

-- Drop FK constraints before altering column types (FKs block ALTER TYPE too)
ALTER TABLE action_messages DROP CONSTRAINT IF EXISTS action_messages_from_user_id_fkey;
ALTER TABLE action_messages DROP CONSTRAINT IF EXISTS action_messages_to_user_id_fkey;
ALTER TABLE action_messages DROP CONSTRAINT IF EXISTS action_messages_responded_by_id_fkey;

-- Change uuid columns to text (if they were created as uuid type previously)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'action_messages' AND column_name = 'from_user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE action_messages ALTER COLUMN from_user_id TYPE text USING from_user_id::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'action_messages' AND column_name = 'to_user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE action_messages ALTER COLUMN to_user_id TYPE text USING to_user_id::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'action_messages' AND column_name = 'responded_by_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE action_messages ALTER COLUMN responded_by_id TYPE text USING responded_by_id::text;
  END IF;
END $$;

-- Add any columns that don't exist yet
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS from_user_name  text NOT NULL DEFAULT '';
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS from_role       text NOT NULL DEFAULT '';
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS from_region     text;
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS to_user_name    text;
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS responded_by_id   text;
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS responded_by_name text;
ALTER TABLE action_messages ADD COLUMN IF NOT EXISTS responded_at      timestamptz;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_am_to_user   ON action_messages (to_user_id);
CREATE INDEX IF NOT EXISTS idx_am_from_user ON action_messages (from_user_id);
CREATE INDEX IF NOT EXISTS idx_am_to_role   ON action_messages (to_role) WHERE to_user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_am_status    ON action_messages (status);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_am_updated_at ON action_messages;
CREATE TRIGGER trg_am_updated_at
  BEFORE UPDATE ON action_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Message code generator ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_message_code(p_region text DEFAULT 'SOM')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reg  text := upper(left(regexp_replace(p_region, '[^A-Za-z]', '', 'g'), 3));
  v_yy   text := to_char(now(), 'YY');
  v_seq  bigint;
  v_code text;
BEGIN
  v_reg := lpad(v_reg, 3, 'X');
  SELECT count(*) + 1 INTO v_seq FROM action_messages
    WHERE message_code LIKE 'MSG-' || v_reg || '-' || v_yy || '-%';
  v_code := 'MSG-' || v_reg || '-' || v_yy || '-' || lpad(v_seq::text, 6, '0');
  RETURN v_code;
END;
$$;

-- ── User search ───────────────────────────────────────────────────────────────
-- Returns auth UUID as text so it works whether stored as uuid or text

DROP FUNCTION IF EXISTS search_users(text);
CREATE OR REPLACE FUNCTION search_users(p_query text)
RETURNS TABLE(
  user_id     text,
  full_name   text,
  email       text,
  role        text,
  region_code text
)
LANGUAGE sql SECURITY DEFINER AS $$
  -- Staff / field officers
  SELECT
    au.id::text, ur.full_name, au.email, ur.role, ur.region_code
  FROM user_registrations ur
  JOIN auth.users au ON lower(au.email) = lower(ur.email)
  WHERE ur.status = 'ACTIVE'
    AND length(trim(p_query)) >= 1
    AND (ur.full_name ILIKE '%' || trim(p_query) || '%'
      OR au.email    ILIKE '%' || trim(p_query) || '%')

  UNION ALL

  -- Approved farmers (join on email so null user_id rows are still found)
  SELECT
    au.id::text, f.full_name, au.email, 'FARMER', f.region
  FROM farmers f
  JOIN auth.users au ON lower(au.email) = lower(f.email)
  WHERE f.status = 'APPROVED'
    AND f.email IS NOT NULL
    AND length(trim(p_query)) >= 1
    AND (f.full_name ILIKE '%' || trim(p_query) || '%'
      OR au.email   ILIKE '%' || trim(p_query) || '%')

  ORDER BY full_name
  LIMIT 10;
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────
-- auth.uid() returns uuid; cast to text to compare with our text columns

ALTER TABLE action_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS am_select ON action_messages;
CREATE POLICY am_select ON action_messages
  FOR SELECT TO authenticated
  USING (
    from_user_id = auth.uid()::text
    OR to_user_id = auth.uid()::text
    OR to_user_id IS NULL
  );

DROP POLICY IF EXISTS am_insert ON action_messages;
CREATE POLICY am_insert ON action_messages
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid()::text);

DROP POLICY IF EXISTS am_update ON action_messages;
CREATE POLICY am_update ON action_messages
  FOR UPDATE TO authenticated
  USING (
    to_user_id = auth.uid()::text
    OR from_user_id = auth.uid()::text
    OR to_user_id IS NULL
  );

-- ── Message replies (threaded conversations) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS action_message_replies (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id     uuid        NOT NULL REFERENCES action_messages(id) ON DELETE CASCADE,
  from_user_id   text        NOT NULL,
  from_user_name text        NOT NULL DEFAULT '',
  from_role      text        NOT NULL DEFAULT '',
  body           text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amr_message ON action_message_replies (message_id);

ALTER TABLE action_message_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS amr_select ON action_message_replies;
CREATE POLICY amr_select ON action_message_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM action_messages am
      WHERE am.id = message_id
        AND (am.from_user_id = auth.uid()::text
          OR am.to_user_id  = auth.uid()::text
          OR am.to_user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS amr_insert ON action_message_replies;
CREATE POLICY amr_insert ON action_message_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM action_messages am
      WHERE am.id = message_id
        AND (am.from_user_id = auth.uid()::text
          OR am.to_user_id  = auth.uid()::text
          OR am.to_user_id IS NULL)
    )
  );

COMMIT;
