CREATE TABLE disease_case_summary_view (
  id            UUID         PRIMARY KEY,
  case_code     VARCHAR(20),
  disease       VARCHAR(200),
  status        VARCHAR(30),
  premises_code VARCHAR(20),
  region_code   VARCHAR(50),
  reported_at   TIMESTAMPTZ,
  confirmed_at  TIMESTAMPTZ
);

CREATE INDEX idx_dcsv_status  ON disease_case_summary_view(status);
CREATE INDEX idx_dcsv_disease ON disease_case_summary_view(disease);
CREATE INDEX idx_dcsv_region  ON disease_case_summary_view(region_code);
