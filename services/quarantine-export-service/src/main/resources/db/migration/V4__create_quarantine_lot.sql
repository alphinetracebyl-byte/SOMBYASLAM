CREATE SEQUENCE quarantine_lot_code_seq START 1;

CREATE TABLE quarantine_lot (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code          VARCHAR(20) NOT NULL UNIQUE,
    consignment_id    UUID        NOT NULL REFERENCES consignment(id),
    status            VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    start_date        DATE        NOT NULL,
    end_date          DATE,
    required_days     INT         NOT NULL,
    test_requirements TEXT,
    all_tests_passed  BOOLEAN,
    supervising_vet_id UUID,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lot_consignment ON quarantine_lot(consignment_id);
