CREATE SEQUENCE owner_code_seq START 1 INCREMENT 1;

CREATE TABLE owner (
    id UUID PRIMARY KEY,
    owner_code VARCHAR(20) UNIQUE,
    owner_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    full_name VARCHAR(200) NOT NULL,
    trading_name VARCHAR(200),
    national_id_type VARCHAR(30) NOT NULL,
    national_id_number VARCHAR(50) NOT NULL,
    primary_phone VARCHAR(30) NOT NULL,
    alternative_phone VARCHAR(30),
    email_address VARCHAR(150),
    region_code VARCHAR(50) NOT NULL,
    district_code VARCHAR(50) NOT NULL,
    village_or_settlement VARCHAR(200),
    gps_latitude NUMERIC(10,7),
    gps_longitude NUMERIC(10,7),
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

CREATE INDEX idx_owner_status ON owner (status);
CREATE INDEX idx_owner_national_id ON owner (national_id_number);
CREATE INDEX idx_owner_region ON owner (region_code, district_code);
