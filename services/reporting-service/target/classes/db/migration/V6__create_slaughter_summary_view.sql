CREATE TABLE slaughter_summary_view (
  id                     UUID        PRIMARY KEY,
  record_code            VARCHAR(20),
  animal_code            VARCHAR(30),
  session_date           DATE,
  abattoir_premises_code VARCHAR(20),
  region_code            VARCHAR(50),
  outcome                VARCHAR(30)
);

CREATE INDEX idx_ssv_outcome ON slaughter_summary_view(outcome);
CREATE INDEX idx_ssv_region  ON slaughter_summary_view(region_code);
