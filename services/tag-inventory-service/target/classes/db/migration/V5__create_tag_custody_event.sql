CREATE TABLE tag_custody_event (
    id UUID PRIMARY KEY,
    tag_serial_or_bag_code VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    from_custodian_id UUID,
    from_custodian_level VARCHAR(30),
    to_custodian_id UUID,
    to_custodian_level VARCHAR(30),
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL,
    notes TEXT
);

CREATE INDEX idx_tag_custody_event_code ON tag_custody_event (tag_serial_or_bag_code);
CREATE INDEX idx_tag_custody_event_performed_at ON tag_custody_event (performed_at);
