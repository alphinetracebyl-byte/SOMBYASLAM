CREATE TABLE consignment_animal (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id UUID        NOT NULL REFERENCES consignment(id),
    animal_id      UUID        NOT NULL,
    animal_code    VARCHAR(30) NOT NULL,
    status         VARCHAR(30) NOT NULL DEFAULT 'INCLUDED',
    added_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by       UUID        NOT NULL,
    cleared_at     TIMESTAMPTZ,
    cleared_by     UUID,
    failure_reason TEXT,
    removed_at     TIMESTAMPTZ,
    removed_by     UUID,
    removal_reason TEXT
);

CREATE INDEX idx_cons_animal_consignment ON consignment_animal(consignment_id);
CREATE INDEX idx_cons_animal_animal      ON consignment_animal(animal_id);
