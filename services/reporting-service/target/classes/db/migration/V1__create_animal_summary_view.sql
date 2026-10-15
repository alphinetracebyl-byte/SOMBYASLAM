CREATE TABLE animal_summary_view (
  id                   UUID         PRIMARY KEY,
  animal_code          VARCHAR(30)  NOT NULL,
  species              VARCHAR(30),
  sex                  VARCHAR(10),
  status               VARCHAR(30),
  current_owner_id     UUID,
  current_owner_code   VARCHAR(20),
  current_premises_id  UUID,
  current_premises_code VARCHAR(20),
  region_code          VARCHAR(50),
  district_code        VARCHAR(50),
  registered_at        TIMESTAMPTZ,
  last_updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_asv_species ON animal_summary_view(species);
CREATE INDEX idx_asv_status  ON animal_summary_view(status);
CREATE INDEX idx_asv_region  ON animal_summary_view(region_code);
