CREATE SEQUENCE vaccination_campaign_code_seq START 1000 INCREMENT 1;

CREATE TABLE vaccination_campaign (
    id UUID PRIMARY KEY,
    campaign_code VARCHAR(20) NOT NULL UNIQUE,
    campaign_name VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    target_species VARCHAR(200) NOT NULL,
    target_region_code VARCHAR(50) NOT NULL,
    target_district_code VARCHAR(50),
    vaccine_product VARCHAR(200) NOT NULL,
    vaccine_batch_number VARCHAR(100) NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    planned_animal_count INT NOT NULL,
    actual_animal_count INT NOT NULL DEFAULT 0,
    assigned_vet_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    version INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_vaccination_campaign_status ON vaccination_campaign (status);
CREATE INDEX idx_vaccination_campaign_region ON vaccination_campaign (target_region_code);
