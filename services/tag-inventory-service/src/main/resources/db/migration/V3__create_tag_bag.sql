CREATE TABLE tag_bag (
    id UUID PRIMARY KEY,
    bag_code VARCHAR(40) NOT NULL UNIQUE,
    batch_id UUID NOT NULL REFERENCES tag_batch(id),
    first_serial VARCHAR(50) NOT NULL,
    last_serial VARCHAR(50) NOT NULL,
    tag_count INT NOT NULL DEFAULT 25,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    current_custody_level VARCHAR(30) NOT NULL,
    current_custodian_id UUID NOT NULL,
    current_custodian_code VARCHAR(30),
    issued_to_owner_id UUID,
    issued_to_owner_code VARCHAR(20),
    issued_at TIMESTAMPTZ,
    issued_by UUID,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tag_bag_batch ON tag_bag (batch_id);
CREATE INDEX idx_tag_bag_status ON tag_bag (status);
CREATE INDEX idx_tag_bag_custodian ON tag_bag (current_custodian_id);
