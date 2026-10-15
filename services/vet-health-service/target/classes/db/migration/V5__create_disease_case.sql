CREATE SEQUENCE disease_case_code_seq START 1000 INCREMENT 1;

CREATE TABLE disease_case (
    id UUID PRIMARY KEY,
    case_code VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'SUSPECTED',
    disease VARCHAR(200) NOT NULL,
    suspected_premises_id UUID,
    suspected_animal_ids TEXT,
    reported_by UUID NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL,
    investigating_vet_id UUID,
    confirmed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closure_notes TEXT,
    outbreak_declared BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_disease_case_status ON disease_case (status);
CREATE INDEX idx_disease_case_premises ON disease_case (suspected_premises_id) WHERE suspected_premises_id IS NOT NULL;
CREATE INDEX idx_disease_case_reported_at ON disease_case (reported_at);
