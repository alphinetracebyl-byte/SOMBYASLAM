CREATE TABLE tag_batch (
    id UUID PRIMARY KEY,
    batch_code VARCHAR(30) NOT NULL UNIQUE,
    manufacturer_name VARCHAR(200) NOT NULL,
    manufacturer_country VARCHAR(100),
    total_bags INT NOT NULL,
    tags_per_bag INT NOT NULL DEFAULT 25,
    batch_received_at TIMESTAMPTZ NOT NULL,
    received_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tag_batch_code ON tag_batch (batch_code);
