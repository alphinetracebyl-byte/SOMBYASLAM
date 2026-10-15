CREATE TABLE movement_animal (
    id                  UUID            NOT NULL,
    movement_id         UUID            NOT NULL,
    animal_id           UUID            NOT NULL,
    animal_code         VARCHAR(25)     NOT NULL,
    tag_serial          VARCHAR(50),
    species             VARCHAR(30)     NOT NULL,
    status              VARCHAR(40)     NOT NULL DEFAULT 'SELECTED',
    exception_notes     VARCHAR(400),
    arrived_tag_serial  VARCHAR(50),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_movement_animal PRIMARY KEY (id),
    CONSTRAINT fk_movement_animal_movement FOREIGN KEY (movement_id) REFERENCES movement (id)
);

COMMENT ON TABLE movement_animal IS 'Per-animal tracking within a movement — each animal gets its own status record';
