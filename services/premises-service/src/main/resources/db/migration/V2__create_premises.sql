CREATE SEQUENCE premises_code_seq START 1 INCREMENT 1;

CREATE TABLE premises (
    id UUID PRIMARY KEY,
    premises_code VARCHAR(20) UNIQUE,
    premises_name VARCHAR(200) NOT NULL,
    premises_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    owner_id UUID NOT NULL,
    owner_code VARCHAR(20) NOT NULL,
    region_code VARCHAR(50) NOT NULL,
    district_code VARCHAR(50) NOT NULL,
    village_or_settlement VARCHAR(200),
    physical_address VARCHAR(500) NOT NULL,
    gps_latitude NUMERIC(10,7) NOT NULL,
    gps_longitude NUMERIC(10,7) NOT NULL,
    area_hectares NUMERIC(10,2),
    capacity_animals INT,
    allowed_species VARCHAR(200),
    license_number VARCHAR(100),
    license_expiry_date DATE,
    is_temporary BOOLEAN NOT NULL DEFAULT FALSE,
    temporary_end_date DATE,
    registered_by UUID NOT NULL,
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    officer_notes TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_premises_owner ON premises (owner_id);
CREATE INDEX idx_premises_status ON premises (status);
CREATE INDEX idx_premises_region ON premises (region_code, district_code);
CREATE INDEX idx_premises_type ON premises (premises_type);
