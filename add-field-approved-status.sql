-- Add FIELD_APPROVED status to farmer_tag_requests
-- Enables two-level approval: Field Officer (regional) → Ministry (national)

ALTER TABLE farmer_tag_requests
  DROP CONSTRAINT IF EXISTS farmer_tag_requests_status_check;

ALTER TABLE farmer_tag_requests
  ADD CONSTRAINT farmer_tag_requests_status_check
  CHECK (status IN ('PENDING', 'FIELD_APPROVED', 'APPROVED', 'REJECTED', 'DELIVERED'));
