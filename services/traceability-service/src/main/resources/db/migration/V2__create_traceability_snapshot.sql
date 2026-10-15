CREATE TABLE traceability_snapshot (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id              UUID         NOT NULL UNIQUE,
  animal_code            VARCHAR(30)  NOT NULL,
  snapshot_generated_at  TIMESTAMPTZ  NOT NULL,
  trace_data             JSONB        NOT NULL
);

CREATE INDEX idx_ts_animal_id ON traceability_snapshot(animal_id);
