-- ── Animal Batch ─────────────────────────────────────────────────────────────
-- A batch groups animals registered or processed together in one field session.

CREATE TABLE animal_batch (
    id               UUID         NOT NULL,
    batch_code       VARCHAR(40)  NOT NULL,
    premises_id      UUID         NOT NULL REFERENCES premises(id),
    registration_year INT         NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    animal_count     INT          NOT NULL DEFAULT 0,
    species          VARCHAR(30),
    created_by       UUID         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    closed_by        UUID,
    closed_at        TIMESTAMPTZ,
    notes            TEXT,
    CONSTRAINT pk_animal_batch PRIMARY KEY (id),
    CONSTRAINT uq_batch_code UNIQUE (batch_code)
);

CREATE SEQUENCE batch_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

CREATE INDEX idx_batch_premises ON animal_batch (premises_id, registration_year);
CREATE INDEX idx_batch_status   ON animal_batch (status);

-- ── Batch Operation Log ───────────────────────────────────────────────────────
-- Immutable record of every action applied to an entire batch by an inspector/vet.

CREATE TABLE batch_operation_log (
    id               UUID         NOT NULL,
    batch_id         UUID         NOT NULL REFERENCES animal_batch(id),
    operation_type   VARCHAR(30)  NOT NULL,
    performed_by     UUID         NOT NULL,
    performed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    affected_count   INT          NOT NULL DEFAULT 0,
    details          JSONB,
    notes            TEXT,
    CONSTRAINT pk_batch_operation_log PRIMARY KEY (id)
);

CREATE INDEX idx_batch_op_batch ON batch_operation_log (batch_id, performed_at);
