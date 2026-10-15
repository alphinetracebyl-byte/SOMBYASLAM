CREATE TABLE owner_document (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owner(id),
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    blob_url VARCHAR(500) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL,
    verified_by UUID,
    verified_at TIMESTAMPTZ
);

CREATE INDEX idx_owner_document ON owner_document (owner_id);
