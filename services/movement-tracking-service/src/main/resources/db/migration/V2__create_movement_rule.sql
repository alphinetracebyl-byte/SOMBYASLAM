CREATE TABLE movement_rule (
    id                      UUID            NOT NULL,
    rule_code               VARCHAR(30)     NOT NULL,
    origin_premises_type    VARCHAR(40)     NOT NULL,
    destination_type        VARCHAR(40)     NOT NULL,
    movement_purpose        VARCHAR(40)     NOT NULL,
    permitted               BOOLEAN         NOT NULL DEFAULT TRUE,
    requires_vet_review     BOOLEAN         NOT NULL DEFAULT FALSE,
    permit_validity_hours   INTEGER         NOT NULL DEFAULT 72,
    mixed_species_allowed   BOOLEAN         NOT NULL DEFAULT FALSE,
    cross_border            BOOLEAN         NOT NULL DEFAULT FALSE,
    notes                   VARCHAR(500),
    active                  BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by              UUID            NOT NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    version                 INTEGER         NOT NULL DEFAULT 0,

    CONSTRAINT pk_movement_rule PRIMARY KEY (id),
    CONSTRAINT uq_movement_rule_code UNIQUE (rule_code),
    CONSTRAINT uq_movement_rule_combination UNIQUE (origin_premises_type, destination_type, movement_purpose)
);

COMMENT ON TABLE movement_rule IS 'Configurable national rules governing which livestock movements are permitted';
