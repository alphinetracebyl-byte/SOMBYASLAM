CREATE TABLE premises_status_history (
    id UUID PRIMARY KEY,
    premises_id UUID NOT NULL REFERENCES premises(id),
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    reason TEXT
);

CREATE INDEX idx_premises_status_history ON premises_status_history (premises_id, changed_at);
