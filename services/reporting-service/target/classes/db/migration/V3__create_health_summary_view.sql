CREATE TABLE health_summary_view (
  id              UUID         PRIMARY KEY,
  event_type      VARCHAR(40),
  animal_code     VARCHAR(30),
  region_code     VARCHAR(50),
  district_code   VARCHAR(50),
  event_date      DATE,
  vaccine_product VARCHAR(200),
  outcome         VARCHAR(30)
);

CREATE INDEX idx_hsv_region     ON health_summary_view(region_code);
CREATE INDEX idx_hsv_event_type ON health_summary_view(event_type);
