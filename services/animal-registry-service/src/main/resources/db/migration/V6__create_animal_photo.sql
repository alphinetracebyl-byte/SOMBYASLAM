CREATE TABLE animal_photo (
    id                  UUID          NOT NULL,
    animal_id           UUID          NOT NULL,
    photo_type          VARCHAR(30)   NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'PENDING_UPLOAD',
    blob_path           VARCHAR(500)  NOT NULL,
    blob_url            VARCHAR(500)  NOT NULL,
    file_size_bytes     BIGINT,
    content_type        VARCHAR(50)   NOT NULL,
    taken_at            TIMESTAMPTZ,
    caption             VARCHAR(250),
    uploaded_by         UUID          NOT NULL,
    uploaded_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ,
    removed_by          UUID,
    removal_reason      TEXT,
    reference_event_id  UUID,
    CONSTRAINT pk_animal_photo PRIMARY KEY (id),
    CONSTRAINT fk_photo_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE INDEX idx_photo_animal  ON animal_photo (animal_id);
CREATE INDEX idx_photo_status  ON animal_photo (animal_id, status);
