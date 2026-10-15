CREATE TABLE notification (
    id UUID PRIMARY KEY,
    notification_code VARCHAR(30) NOT NULL UNIQUE,
    recipient_id UUID NOT NULL,
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(150),
    channel VARCHAR(20) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    template_id UUID,
    subject VARCHAR(250),
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failure_reason VARCHAR(500),
    retry_count INT NOT NULL DEFAULT 0,
    source_aggregate_type VARCHAR(50),
    source_aggregate_id UUID,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_notification_recipient ON notification (recipient_id);
CREATE INDEX idx_notification_status ON notification (status);
CREATE INDEX idx_notification_recipient_status ON notification (recipient_id, status);
