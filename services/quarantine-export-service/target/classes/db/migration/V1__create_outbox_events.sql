CREATE TABLE outbox_event (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type     VARCHAR(100)  NOT NULL,
    aggregate_type VARCHAR(50)   NOT NULL,
    aggregate_id   UUID          NOT NULL,
    payload        JSONB         NOT NULL,
    occurred_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    correlation_id UUID,
    published_at   TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unpublished ON outbox_event(occurred_at) WHERE published_at IS NULL;
