CREATE TABLE slaughter_session (
    id                      UUID         PRIMARY KEY,
    session_code            VARCHAR(25)  NOT NULL UNIQUE,
    abattoir_premises_id    UUID         NOT NULL,
    abattoir_premises_code  VARCHAR(30)  NOT NULL,
    session_date            DATE         NOT NULL,
    status                  VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
    supervising_vet_id      UUID,
    opened_by               UUID         NOT NULL,
    opened_at               TIMESTAMPTZ  NOT NULL,
    closed_by               UUID,
    closed_at               TIMESTAMPTZ,
    total_animals           INT          NOT NULL DEFAULT 0,
    slaughtered_count       INT          NOT NULL DEFAULT 0,
    condemned_count         INT          NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ  NOT NULL,
    version                 BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_session_premises ON slaughter_session (abattoir_premises_id);
CREATE INDEX idx_session_date     ON slaughter_session (session_date);
CREATE INDEX idx_session_status   ON slaughter_session (status);
