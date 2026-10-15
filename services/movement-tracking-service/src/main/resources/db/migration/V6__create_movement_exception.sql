CREATE TABLE movement_exception (
    id                  UUID            NOT NULL,
    movement_id         UUID            NOT NULL,
    exception_type      VARCHAR(40)     NOT NULL,
    animal_id           UUID,
    animal_code         VARCHAR(25),
    tag_serial_found    VARCHAR(50),
    notes               VARCHAR(500),
    reported_by         UUID            NOT NULL,
    reported_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved            BOOLEAN         NOT NULL DEFAULT FALSE,
    resolved_by         UUID,
    resolution_notes    VARCHAR(500),
    resolved_at         TIMESTAMPTZ,

    CONSTRAINT pk_movement_exception PRIMARY KEY (id),
    CONSTRAINT fk_movement_exception_movement FOREIGN KEY (movement_id) REFERENCES movement (id)
);

COMMENT ON TABLE movement_exception IS 'Exceptions recorded at arrival — missing, dead, tag mismatch, rejected animals';
