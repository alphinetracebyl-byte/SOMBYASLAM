CREATE TABLE animal_status_history (
    id                  UUID         NOT NULL,
    animal_id           UUID         NOT NULL,
    from_status         VARCHAR(20),
    to_status           VARCHAR(20)  NOT NULL,
    reason              TEXT,
    reference_event_id  UUID,
    triggered_by        UUID         NOT NULL,
    occurred_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_animal_status_history PRIMARY KEY (id),
    CONSTRAINT fk_status_history_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE INDEX idx_status_history_animal ON animal_status_history (animal_id, occurred_at);

CREATE TABLE amendment_event (
    id                      UUID         NOT NULL,
    animal_id               UUID         NOT NULL,
    amended_by              UUID         NOT NULL,
    amended_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    amendment_reason        TEXT         NOT NULL,
    ministry_approval_ref   VARCHAR(100),
    fields_changed          JSONB        NOT NULL,
    CONSTRAINT pk_amendment_event PRIMARY KEY (id),
    CONSTRAINT fk_amendment_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE TABLE death_event (
    id                   UUID         NOT NULL,
    animal_id            UUID         NOT NULL,
    death_date           DATE         NOT NULL,
    cause_of_death       VARCHAR(100),
    location_description TEXT,
    photo_id             UUID,
    notes                TEXT,
    recorded_by          UUID         NOT NULL,
    recorded_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_death_event PRIMARY KEY (id),
    CONSTRAINT fk_death_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE TABLE slaughter_event (
    id             UUID         NOT NULL,
    animal_id      UUID         NOT NULL,
    slaughter_date DATE         NOT NULL,
    abattoir_id    UUID         NOT NULL,
    slaughter_ref  VARCHAR(100) NOT NULL,
    recorded_by    UUID         NOT NULL,
    recorded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_slaughter_event PRIMARY KEY (id),
    CONSTRAINT fk_slaughter_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE TABLE export_event (
    id                  UUID         NOT NULL,
    animal_id           UUID         NOT NULL,
    export_date         DATE         NOT NULL,
    border_post_id      UUID         NOT NULL,
    export_permit_ref   VARCHAR(100) NOT NULL,
    destination_country CHAR(2)      NOT NULL,
    recorded_by         UUID         NOT NULL,
    recorded_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_export_event PRIMARY KEY (id),
    CONSTRAINT fk_export_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);

CREATE TABLE confiscation_event (
    id                      UUID         NOT NULL,
    animal_id               UUID         NOT NULL,
    confiscation_date       DATE         NOT NULL,
    reason                  TEXT         NOT NULL,
    location_description    TEXT,
    enforcement_order_ref   VARCHAR(100) NOT NULL,
    enforcement_officer_id  UUID         NOT NULL,
    recorded_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    released_by             UUID,
    released_at             TIMESTAMPTZ,
    release_reason          TEXT,
    CONSTRAINT pk_confiscation_event PRIMARY KEY (id),
    CONSTRAINT fk_confiscation_animal FOREIGN KEY (animal_id)
        REFERENCES animal_record (id)
);
