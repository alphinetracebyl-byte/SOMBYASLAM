CREATE TABLE movement_checkpoint (
    id                      UUID            NOT NULL,
    movement_id             UUID            NOT NULL,
    checkpoint_name         VARCHAR(150)    NOT NULL,
    checkpoint_region       VARCHAR(60),
    officer_id              UUID            NOT NULL,
    officer_name            VARCHAR(150)    NOT NULL,
    animals_verified_count  INTEGER         NOT NULL DEFAULT 0,
    permit_verified         BOOLEAN         NOT NULL DEFAULT FALSE,
    anomaly_noted           BOOLEAN         NOT NULL DEFAULT FALSE,
    anomaly_notes           VARCHAR(400),
    offline_recorded        BOOLEAN         NOT NULL DEFAULT FALSE,
    recorded_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_movement_checkpoint PRIMARY KEY (id),
    CONSTRAINT fk_movement_checkpoint_movement FOREIGN KEY (movement_id) REFERENCES movement (id)
);

COMMENT ON TABLE movement_checkpoint IS 'Checkpoint passes recorded by officers as animals move between regions';
