-- app_settings: global key-value store for ministry configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT        PRIMARY KEY,
    value      TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename  = 'app_settings'
          AND policyname = 'app_settings_select'
    ) THEN
        CREATE POLICY app_settings_select ON app_settings FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename  = 'app_settings'
          AND policyname = 'app_settings_all'
    ) THEN
        CREATE POLICY app_settings_all ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END;
$$;

-- Seed default settings
INSERT INTO app_settings (key, value) VALUES
  ('auto_approval_enabled',    'true'),
  ('movement_task_mode',       'BOTH'),
  ('inspection_escalation_days', '2')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspection_region_settings (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code           TEXT        NOT NULL UNIQUE,
    region_name           TEXT,
    field_inspector_id    UUID,
    field_inspector_name  TEXT,
    vet_officer_id        UUID,
    vet_officer_name      TEXT,
    auto_assign_enabled   BOOLEAN     NOT NULL DEFAULT true,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inspection_region_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename  = 'inspection_region_settings'
          AND policyname = 'irs_select'
    ) THEN
        CREATE POLICY irs_select
            ON inspection_region_settings
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename  = 'inspection_region_settings'
          AND policyname = 'irs_all'
    ) THEN
        CREATE POLICY irs_all
            ON inspection_region_settings
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END;
$$;

-- (inspection_escalation_days already seeded above)
