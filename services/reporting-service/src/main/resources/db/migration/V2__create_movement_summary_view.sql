CREATE TABLE movement_summary_view (
  id                        UUID         PRIMARY KEY,
  movement_code             VARCHAR(20),
  status                    VARCHAR(30),
  origin_premises_code      VARCHAR(20),
  destination_premises_code VARCHAR(20),
  origin_region             VARCHAR(50),
  destination_region        VARCHAR(50),
  purpose                   VARCHAR(50),
  animal_count              INT,
  departed_at               TIMESTAMPTZ,
  arrived_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ
);

CREATE INDEX idx_msv_status ON movement_summary_view(status);
CREATE INDEX idx_msv_origin_region ON movement_summary_view(origin_region);
