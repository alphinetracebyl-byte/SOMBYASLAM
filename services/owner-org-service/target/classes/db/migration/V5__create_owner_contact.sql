CREATE TABLE owner_contact (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owner(id),
    contact_type VARCHAR(50) NOT NULL,
    contact_value VARCHAR(200) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_owner_contact ON owner_contact (owner_id);
