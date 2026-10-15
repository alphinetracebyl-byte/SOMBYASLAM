-- Outbox events table — shared pattern across all SOMLITS services.
-- The outbox relay reads unpublished events and publishes them to Azure Service Bus.
-- Once published, published_at is set. Records are never deleted.

CREATE TABLE outbox_events (
    id              UUID            NOT NULL,
    event_type      VARCHAR(100)    NOT NULL,
    aggregate_type  VARCHAR(50)     NOT NULL,
    aggregate_id    UUID            NOT NULL,
    payload         JSONB           NOT NULL,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    correlation_id  UUID,
    published_at    TIMESTAMPTZ,

    CONSTRAINT pk_outbox_events PRIMARY KEY (id)
);

CREATE INDEX idx_outbox_events_unpublished
    ON outbox_events (occurred_at)
    WHERE published_at IS NULL;

COMMENT ON TABLE outbox_events IS
    'Transactional outbox for reliable Service Bus event publishing. '
    'Relay polls WHERE published_at IS NULL ORDER BY occurred_at ASC.';
