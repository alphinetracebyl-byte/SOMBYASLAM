-- ── Quarantine Zones (field portal) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quarantine_zones (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code          text        NOT NULL UNIQUE,
  zone_name          text        NOT NULL,
  zone_type          text        NOT NULL DEFAULT 'DISEASE_OUTBREAK',
  -- DISEASE_OUTBREAK | BORDER_CONTROL | EXPORT_HOLD | ROUTINE_HEALTH
  status             text        NOT NULL DEFAULT 'ACTIVE',
  -- ACTIVE | CLEARANCE_IN_PROGRESS | LIFTED
  region_code        text,
  district_code      text,
  declared_date      date        NOT NULL DEFAULT CURRENT_DATE,
  expected_lift_date date,
  actual_lift_date   date,
  reason             text,
  premises_count     int         NOT NULL DEFAULT 0,
  animal_count       int         NOT NULL DEFAULT 0,
  movement_blocked   boolean     NOT NULL DEFAULT true,
  declared_by_id     text,
  declared_by_name   text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quarantine_inspection_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         uuid        NOT NULL REFERENCES quarantine_zones(id) ON DELETE CASCADE,
  zone_code       text        NOT NULL,
  log_type        text        NOT NULL,
  -- Routine Inspection | Health Check | Breach Investigation | Clearance Inspection | Sample Collection | Veterinary Assessment | Lift Recommendation
  officer_id      text,
  officer_name    text,
  officer_role    text,
  findings        text,
  outcome         text,
  animals_checked int,
  sample_type     text,
  lab_name        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qz_region ON quarantine_zones(region_code);
CREATE INDEX IF NOT EXISTS idx_qz_status ON quarantine_zones(status);
CREATE INDEX IF NOT EXISTS idx_qil_zone  ON quarantine_inspection_logs(zone_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE quarantine_zones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantine_inspection_logs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read zones
CREATE POLICY qz_select  ON quarantine_zones           FOR SELECT TO authenticated USING (true);
CREATE POLICY qil_select ON quarantine_inspection_logs FOR SELECT TO authenticated USING (true);

-- Any authenticated user can insert inspection logs
CREATE POLICY qil_insert ON quarantine_inspection_logs FOR INSERT TO authenticated
  WITH CHECK (officer_id = auth.uid()::text);

-- Ministry can insert / update zones (field portal read-only for zones)
CREATE POLICY qz_insert ON quarantine_zones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY qz_update ON quarantine_zones FOR UPDATE TO authenticated USING (true);

-- ── Sample data ─────────────────────────────────────────────────────────────
INSERT INTO quarantine_zones (zone_code, zone_name, zone_type, status, region_code, declared_date, expected_lift_date, reason, premises_count, animal_count, movement_blocked, declared_by_name)
VALUES
  ('QZ-2026-001', 'Bay Region Zone A',     'DISEASE_OUTBREAK', 'ACTIVE',                'BAY', '2026-07-20', '2026-08-20', 'FMD outbreak detected at SO-PRM-BAY-003. Three premises confirmed.',                                      8, 340, true,  'Dr. Hassan Abdi (MVO)'),
  ('QZ-2026-002', 'Jubbaland Border Zone', 'BORDER_CONTROL',   'ACTIVE',                'GED', '2026-07-25', '2026-09-01', 'Border entry point — routine health screening of incoming animals from Ethiopia.',                         3, 150, true,  'Regional Quarantine Office'),
  ('QZ-2026-003', 'Mogadishu South Zone',  'DISEASE_OUTBREAK', 'CLEARANCE_IN_PROGRESS', 'BAN', '2026-07-01', '2026-08-10', 'CBPP suspected at SO-PRM-BAN-007. Lab results returned negative. Clearance pending final inspection.',    5, 210, false, 'Dr. Fadumo Ali (CVO)'),
  ('QZ-2026-007', 'Nugaal Zone B',         'DISEASE_OUTBREAK', 'ACTIVE',                'NUG', '2026-08-02', '2026-09-02', 'PPR confirmed at SO-PRM-NUG-009. Two premises affected. Active surveillance ongoing.',                    6, 280, true,  'Nugaal Quarantine Office')
ON CONFLICT (zone_code) DO NOTHING;

INSERT INTO quarantine_inspection_logs (zone_id, zone_code, log_type, officer_name, officer_role, findings, outcome, animals_checked)
SELECT id, zone_code, 'Routine Inspection', 'Hassan Abdi', 'FIELD_INSPECTOR',
  'No new symptoms observed. All animals present and accounted for. Fencing intact.', 'Compliant', 45
FROM quarantine_zones WHERE zone_code = 'QZ-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO quarantine_inspection_logs (zone_id, zone_code, log_type, officer_name, officer_role, findings, outcome, animals_checked, sample_type, lab_name)
SELECT id, zone_code, 'Sample Collection', 'Dr. Ahmed VO', 'VETERINARY_OFFICER',
  'Blood samples collected from 12 cattle for FMD confirmation. Animals sedated and in good condition.', 'Samples Sent', 12, 'Blood', 'Mogadishu Central Veterinary Lab'
FROM quarantine_zones WHERE zone_code = 'QZ-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO quarantine_inspection_logs (zone_id, zone_code, log_type, officer_name, officer_role, findings, outcome)
SELECT id, zone_code, 'Clearance Inspection', 'Dr. Fadumo', 'VETERINARY_OFFICER',
  'Final inspection completed. All animals appear healthy. No active disease signs present. Lab results confirmed negative.', 'Recommend Lifting'
FROM quarantine_zones WHERE zone_code = 'QZ-2026-003'
ON CONFLICT DO NOTHING;
