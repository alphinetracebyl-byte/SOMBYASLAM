-- ══════════════════════════════════════════════════════════════
-- SOMLITS — Delete all seed / trial data
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Clear all movement and export records
delete from exported_batches;
delete from outgoing_movements;
delete from incoming_movements;

-- Clear all animal and batch records
delete from animals;
delete from batches;

-- Clear seed premises (keep any real farmer_premises rows)
delete from premises;

-- farmer_premises rows are owned by real auth users — leave them intact
-- delete from farmer_premises;  -- uncomment only if you want to wipe those too
