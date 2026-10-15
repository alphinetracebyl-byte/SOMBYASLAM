CREATE TABLE movement_status_history (
    id                  UUID            NOT NULL,
    movement_id         UUID            NOT NULL,
    from_status         VARCHAR(40),
    to_status           VARCHAR(40)     NOT NULL,
    actor_id            UUID,
    actor_role          VARCHAR(80),
    reason              VARCHAR(500),
    offline_recorded    BOOLEAN         NOT NULL DEFAULT FALSE,
    occurred_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_movement_status_history PRIMARY KEY (id),
    CONSTRAINT fk_movement_status_history_movement FOREIGN KEY (movement_id) REFERENCES movement (id)
);

COMMENT ON TABLE movement_status_history IS 'Immutable audit trail of every status transition for a movement';
