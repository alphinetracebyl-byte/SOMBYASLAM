CREATE TABLE animal_record (
    id                   UUID         NOT NULL,
    animal_code          VARCHAR(25)  NOT NULL,
    species              VARCHAR(30)  NOT NULL,
    breed                VARCHAR(60)  NOT NULL,
    sex                  VARCHAR(10)  NOT NULL,
    dob                  DATE,
    dob_precision        VARCHAR(10)  NOT NULL DEFAULT 'UNKNOWN',
    coat_color           VARCHAR(100),
    distinguishing_marks TEXT,
    status               VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    current_owner_id     UUID         NOT NULL,
    current_premises_id  UUID         NOT NULL,
    active_tag_serial    VARCHAR(50),
    primary_photo_id     UUID,
    source_type          VARCHAR(20)  NOT NULL,
    terminated_at        TIMESTAMPTZ,
    registered_by        UUID         NOT NULL,
    registered_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version              INT          NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_animal_record PRIMARY KEY (id),
    CONSTRAINT uq_animal_code UNIQUE (animal_code)
);

CREATE SEQUENCE animal_code_seq START WITH 1 INCREMENT BY 1 NO CYCLE;
