CREATE SEQUENCE market_session_code_seq START 1 INCREMENT 1;

CREATE TABLE market_session (
    id UUID PRIMARY KEY,
    session_code VARCHAR(25) NOT NULL UNIQUE,
    market_premises_id UUID NOT NULL,
    market_premises_code VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    session_date DATE NOT NULL,
    opened_at TIMESTAMPTZ,
    opened_by UUID,
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    supervising_vet_id UUID,
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_session_premises ON market_session (market_premises_id);
CREATE INDEX idx_session_date ON market_session (session_date);
CREATE INDEX idx_session_status ON market_session (status);
