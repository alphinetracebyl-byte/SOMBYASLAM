-- Animal record lookup indexes
CREATE INDEX idx_animal_owner    ON animal_record (current_owner_id);
CREATE INDEX idx_animal_premises ON animal_record (current_premises_id);
CREATE INDEX idx_animal_status   ON animal_record (status);
CREATE INDEX idx_animal_species  ON animal_record (species);
CREATE INDEX idx_animal_tag      ON animal_record (active_tag_serial);

-- Composite for common herd queries
CREATE INDEX idx_animal_owner_status ON animal_record (current_owner_id, status);
