CREATE TABLE ownership_record (
    id                  UUID         NOT NULL,
    animal_id           UUID         NOT NULL,
    owner_id            UUID         NOT NULL,
    started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    transfer_reference  VARCHAR(100),
    transfer_notes      TEXT,
    recorded_by         UUID         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ownership_record PRIMARY KEY (id),
    CONSTRAINT fk_ownership_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE INDEX idx_ownership_animal ON ownership_record (animal_id);
CREATE INDEX idx_ownership_owner  ON ownership_record (owner_id);

CREATE TABLE premises_assignment (
    id            UUID         NOT NULL,
    animal_id     UUID         NOT NULL,
    premises_id   UUID         NOT NULL,
    started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMPTZ,
    reason        TEXT,
    recorded_by   UUID         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_premises_assignment PRIMARY KEY (id),
    CONSTRAINT fk_premises_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE INDEX idx_premises_animal  ON premises_assignment (animal_id);
CREATE INDEX idx_premises_current ON premises_assignment (animal_id, premises_id)
    WHERE ended_at IS NULL;
