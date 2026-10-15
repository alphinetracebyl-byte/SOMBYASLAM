-- Remove purpose column from farmer_tag_requests
-- Purpose field removed from tag request workflow

ALTER TABLE farmer_tag_requests
  DROP COLUMN IF EXISTS purpose;
