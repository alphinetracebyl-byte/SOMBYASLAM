CREATE SEQUENCE sample_code_seq START 10000 INCREMENT 1;

CREATE TABLE sample (
    id UUID PRIMARY KEY,
    sample_code VARCHAR(20) NOT NULL UNIQUE,
    health_event_id UUID NOT NULL REFERENCES health_event(id),
    animal_id UUID NOT NULL,
    animal_code VARCHAR(30) NOT NULL,
    sample_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'COLLECTED',
    collected_by UUID NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL,
    laboratory_id UUID,
    laboratory_code VARCHAR(30),
    submitted_at TIMESTAMPTZ,
    result_received_at TIMESTAMPTZ,
    lab_result VARCHAR(30),
    lab_notes TEXT,
    linked_disease_case_id UUID REFERENCES disease_case(id),
    version INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sample_health_event ON sample (health_event_id);
CREATE INDEX idx_sample_animal ON sample (animal_id);
CREATE INDEX idx_sample_status ON sample (status);
