-- Add batch tracking fields to animal_record.
-- batch_id references the premises-service animal_batch table (cross-service FK — not enforced at DB level).
-- batch_code is denormalised for display without a cross-service join.

ALTER TABLE animal_record
    ADD COLUMN batch_id   UUID        NULL,
    ADD COLUMN batch_code VARCHAR(40) NULL;

CREATE INDEX idx_animal_batch ON animal_record (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_animal_batch_code ON animal_record (batch_code) WHERE batch_code IS NOT NULL;
