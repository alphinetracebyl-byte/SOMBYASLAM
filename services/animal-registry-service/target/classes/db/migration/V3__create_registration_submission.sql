CREATE TABLE registration_submission (
    id                    UUID         NOT NULL,
    submission_code       VARCHAR(30)  NOT NULL,
    animal_id             UUID         NOT NULL,
    submission_type       VARCHAR(20)  NOT NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    source_type           VARCHAR(20),
    source_description    TEXT,
    import_permit_number  VARCHAR(100),
    country_of_origin     CHAR(2),
    foreign_id_number     VARCHAR(100),
    submitted_by          UUID         NOT NULL,
    submitted_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_by           UUID,
    reviewed_at           TIMESTAMPTZ,
    rejection_reason      TEXT,
    officer_notes         TEXT,
    idempotency_key       UUID         NOT NULL,
    CONSTRAINT pk_registration_submission PRIMARY KEY (id),
    CONSTRAINT uq_submission_code UNIQUE (submission_code),
    CONSTRAINT uq_submission_idempotency UNIQUE (idempotency_key),
    CONSTRAINT fk_submission_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE INDEX idx_submission_animal ON registration_submission (animal_id);
CREATE INDEX idx_submission_status  ON registration_submission (status);
