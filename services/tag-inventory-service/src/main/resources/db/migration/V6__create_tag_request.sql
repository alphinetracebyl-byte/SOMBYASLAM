CREATE SEQUENCE tag_request_code_seq START 1000 INCREMENT 1;

CREATE TABLE tag_request (
    id UUID PRIMARY KEY,
    request_code VARCHAR(20) NOT NULL UNIQUE,
    owner_id UUID NOT NULL,
    owner_code VARCHAR(20) NOT NULL,
    requested_bag_count INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    requested_by UUID NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    fulfilled_at TIMESTAMPTZ,
    notes TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tag_request_owner ON tag_request (owner_id);
CREATE INDEX idx_tag_request_status ON tag_request (status);
