CREATE TABLE slaughter_record (
    id                          UUID         PRIMARY KEY,
    record_code                 VARCHAR(25)  NOT NULL UNIQUE,
    session_id                  UUID         NOT NULL REFERENCES slaughter_session(id),
    animal_id                   UUID         NOT NULL,
    animal_code                 VARCHAR(25)  NOT NULL,
    tag_serial                  VARCHAR(50),
    movement_permit_id          UUID,
    owner_code                  VARCHAR(30)  NOT NULL,
    status                      VARCHAR(30)  NOT NULL DEFAULT 'ARRIVED',
    arrived_at                  TIMESTAMPTZ  NOT NULL,
    arrived_by                  UUID         NOT NULL,
    tag_verified                BOOLEAN      NOT NULL DEFAULT FALSE,
    permit_verified             BOOLEAN      NOT NULL DEFAULT FALSE,
    ante_mortem_decision        VARCHAR(20),
    ante_mortem_inspected_by    UUID,
    ante_mortem_at              TIMESTAMPTZ,
    ante_mortem_notes           TEXT,
    hold_reason                 TEXT,
    slaughtered_at              TIMESTAMPTZ,
    slaughtered_by              UUID,
    lairage_hours               INT,
    post_mortem_decision        VARCHAR(25),
    post_mortem_inspected_by    UUID,
    post_mortem_at              TIMESTAMPTZ,
    post_mortem_notes           TEXT,
    condemnation_reason         TEXT,
    condemned_partial           BOOLEAN,
    version                     BIGINT       NOT NULL DEFAULT 0,
    updated_at                  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_record_session ON slaughter_record (session_id);
CREATE INDEX idx_record_animal  ON slaughter_record (animal_id);
CREATE INDEX idx_record_status  ON slaughter_record (status);
