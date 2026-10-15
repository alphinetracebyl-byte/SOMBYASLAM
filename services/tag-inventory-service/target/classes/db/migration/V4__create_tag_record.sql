CREATE TABLE tag_record (
    id UUID PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    bag_id UUID NOT NULL REFERENCES tag_bag(id),
    batch_id UUID NOT NULL REFERENCES tag_batch(id),
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    current_custody_level VARCHAR(30) NOT NULL,
    current_custodian_id UUID NOT NULL,
    animal_id UUID,
    animal_code VARCHAR(30),
    reserved_for_request_id UUID,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tag_record_serial ON tag_record (serial_number);
CREATE INDEX idx_tag_record_bag ON tag_record (bag_id);
CREATE INDEX idx_tag_record_animal ON tag_record (animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX idx_tag_record_status ON tag_record (status);
