CREATE TABLE export_summary_view (
  id                   UUID         PRIMARY KEY,
  consignment_code     VARCHAR(20),
  exporter_owner_code  VARCHAR(20),
  destination_country  VARCHAR(100),
  animal_count         INT,
  status               VARCHAR(40),
  exported_at          TIMESTAMPTZ
);

CREATE INDEX idx_esv_status              ON export_summary_view(status);
CREATE INDEX idx_esv_destination_country ON export_summary_view(destination_country);
