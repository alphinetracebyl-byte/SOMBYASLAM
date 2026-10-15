CREATE TABLE owner_status_history (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owner(id),
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    reason TEXT
);

CREATE INDEX idx_owner_status_history ON owner_status_history (owner_id, changed_at);
