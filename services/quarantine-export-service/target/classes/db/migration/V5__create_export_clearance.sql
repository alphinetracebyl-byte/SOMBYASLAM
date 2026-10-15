CREATE SEQUENCE export_clearance_code_seq START 1;

CREATE TABLE export_clearance (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_code  VARCHAR(20) NOT NULL UNIQUE,
    consignment_id  UUID        NOT NULL REFERENCES consignment(id),
    animal_id       UUID,
    clearance_date  DATE        NOT NULL,
    issued_by       UUID        NOT NULL,
    valid_until     DATE        NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
    revoked_by      UUID,
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_clearance_consignment ON export_clearance(consignment_id);
CREATE INDEX idx_clearance_animal      ON export_clearance(animal_id);
