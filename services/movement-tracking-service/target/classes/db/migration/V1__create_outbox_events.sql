CREATE TABLE outbox_event (
    id              UUID            NOT NULL,
    event_type      VARCHAR(80)     NOT NULL,
    aggregate_type  VARCHAR(60)     NOT NULL,
    aggregate_id    UUID            NOT NULL,
    payload         TEXT            NOT NULL,
    correlation_id  UUID,
    published       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,

    CONSTRAINT pk_outbox_event PRIMARY KEY (id)
);

CREATE INDEX idx_outbox_event_unpublished
    ON outbox_event (created_at)
    WHERE published = FALSE;
