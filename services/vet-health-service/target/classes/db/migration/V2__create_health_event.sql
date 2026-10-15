CREATE SEQUENCE health_event_code_seq START 10000 INCREMENT 1;

CREATE TABLE health_event (
    id UUID PRIMARY KEY,
    event_code VARCHAR(20) NOT NULL UNIQUE,
    event_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RECORDED',
    animal_id UUID NOT NULL,
    animal_code VARCHAR(30) NOT NULL,
    premises_id UUID,
    premises_code VARCHAR(20),
    responsible_vet_id UUID NOT NULL,
    responsible_vet_name VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    diagnosis TEXT,
    treatment TEXT,
    vaccine_product VARCHAR(200),
    vaccine_batch_number VARCHAR(100),
    vaccine_expiry_date DATE,
    dose_ml NUMERIC(6,2),
    route_of_administration VARCHAR(50),
    next_due_date DATE,
    clinical_notes TEXT,
    fitness_decision VARCHAR(30),
    fitness_notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_health_event_animal ON health_event (animal_id);
CREATE INDEX idx_health_event_premises ON health_event (premises_id) WHERE premises_id IS NOT NULL;
CREATE INDEX idx_health_event_status ON health_event (status);
CREATE INDEX idx_health_event_date ON health_event (event_date);
