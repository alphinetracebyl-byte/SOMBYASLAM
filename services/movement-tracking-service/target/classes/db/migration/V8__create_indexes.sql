-- movement indexes
CREATE INDEX idx_movement_status           ON movement (status);
CREATE INDEX idx_movement_initiator_id     ON movement (initiator_id);
CREATE INDEX idx_movement_origin           ON movement (origin_premises_id);
CREATE INDEX idx_movement_destination      ON movement (destination_premises_id) WHERE destination_premises_id IS NOT NULL;
CREATE INDEX idx_movement_permit_until     ON movement (permit_valid_until) WHERE status IN ('PERMIT_ISSUED', 'APPROVED');
CREATE INDEX idx_movement_created_at       ON movement (created_at DESC);

-- movement_animal indexes
CREATE INDEX idx_movement_animal_movement  ON movement_animal (movement_id);
CREATE INDEX idx_movement_animal_animal    ON movement_animal (animal_id);
CREATE INDEX idx_movement_animal_status    ON movement_animal (movement_id, status);

-- movement_checkpoint indexes
CREATE INDEX idx_movement_checkpoint_mv    ON movement_checkpoint (movement_id, recorded_at);

-- movement_exception indexes
CREATE INDEX idx_movement_exception_mv     ON movement_exception (movement_id);
CREATE INDEX idx_movement_exception_open   ON movement_exception (movement_id, resolved) WHERE resolved = FALSE;

-- movement_status_history indexes
CREATE INDEX idx_movement_history_mv       ON movement_status_history (movement_id, occurred_at);

-- movement_rule indexes
CREATE INDEX idx_movement_rule_active      ON movement_rule (active) WHERE active = TRUE;
