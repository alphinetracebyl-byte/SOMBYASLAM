CREATE SEQUENCE movement_restriction_code_seq START 1000 INCREMENT 1;

CREATE TABLE movement_restriction (
    id UUID PRIMARY KEY,
    restriction_code VARCHAR(20) NOT NULL UNIQUE,
    animal_id UUID,
    premises_id UUID,
    reason TEXT NOT NULL,
    disease_suspected VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    imposed_by UUID NOT NULL,
    imposed_at TIMESTAMPTZ NOT NULL,
    lifted_by UUID,
    lifted_at TIMESTAMPTZ,
    lift_reason TEXT,
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_movement_restriction_animal ON movement_restriction (animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX idx_movement_restriction_premises ON movement_restriction (premises_id) WHERE premises_id IS NOT NULL;
CREATE INDEX idx_movement_restriction_status ON movement_restriction (status);
