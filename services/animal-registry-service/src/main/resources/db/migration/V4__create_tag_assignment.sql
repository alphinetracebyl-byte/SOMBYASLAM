CREATE TABLE tag_assignment (
    id                      UUID        NOT NULL,
    animal_id               UUID        NOT NULL,
    tag_serial              VARCHAR(50) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by             UUID        NOT NULL,
    closed_at               TIMESTAMPTZ,
    close_reason            VARCHAR(30),
    replacement_reason      VARCHAR(20),
    new_serial_is_same      BOOLEAN     NOT NULL DEFAULT FALSE,
    linked_replacement_id   UUID,
    CONSTRAINT pk_tag_assignment PRIMARY KEY (id),
    CONSTRAINT fk_tag_assignment_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE INDEX idx_tag_assignment_animal  ON tag_assignment (animal_id);
CREATE INDEX idx_tag_assignment_serial  ON tag_assignment (tag_serial);
CREATE UNIQUE INDEX uq_tag_assignment_active_serial
    ON tag_assignment (tag_serial) WHERE status = 'ACTIVE';
