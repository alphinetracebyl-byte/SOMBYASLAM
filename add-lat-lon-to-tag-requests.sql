-- Add latitude and longitude to farmer_tag_requests
-- Run in Supabase SQL Editor

ALTER TABLE farmer_tag_requests
  ADD COLUMN IF NOT EXISTS latitude  numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
