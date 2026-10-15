CREATE SEQUENCE tag_transfer_code_seq START 1000 INCREMENT 1;

CREATE TABLE tag_transfer (
    id UUID PRIMARY KEY,
    transfer_code VARCHAR(20) NOT NULL UNIQUE,
    transfer_type VARCHAR(40) NOT NULL,
    from_custodian_id UUID NOT NULL,
    from_custodian_level VARCHAR(30) NOT NULL,
    to_custodian_id UUID NOT NULL,
    to_custodian_level VARCHAR(30) NOT NULL,
    bag_count INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    initiated_by UUID NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL,
    received_by UUID,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tag_transfer_from ON tag_transfer (from_custodian_id);
CREATE INDEX idx_tag_transfer_to ON tag_transfer (to_custodian_id);
CREATE INDEX idx_tag_transfer_status ON tag_transfer (status);
