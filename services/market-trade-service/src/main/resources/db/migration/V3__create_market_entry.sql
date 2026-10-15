CREATE SEQUENCE market_entry_code_seq START 1 INCREMENT 1;

CREATE TABLE market_entry (
    id UUID PRIMARY KEY,
    entry_code VARCHAR(25) NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES market_session(id),
    animal_id UUID NOT NULL,
    animal_code VARCHAR(25) NOT NULL,
    owner_id UUID NOT NULL,
    owner_code VARCHAR(30) NOT NULL,
    movement_id UUID,
    holding_pen VARCHAR(50),
    entered_at TIMESTAMPTZ NOT NULL,
    entered_by UUID NOT NULL,
    vet_inspection_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    inspected_by UUID,
    inspected_at TIMESTAMPTZ,
    inspection_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    exited_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_entry_session ON market_entry (session_id);
CREATE INDEX idx_entry_animal ON market_entry (animal_id);
