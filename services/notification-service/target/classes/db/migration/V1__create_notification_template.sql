CREATE TABLE notification_template (
    id UUID PRIMARY KEY,
    template_code VARCHAR(100) NOT NULL UNIQUE,
    event_category VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    subject VARCHAR(250),
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_template_event_channel ON notification_template (event_category, channel);
