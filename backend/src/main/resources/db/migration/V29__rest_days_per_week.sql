-- Add structured rest-days-per-week count to placements.
-- Defaults to 1 for all existing rows.
ALTER TABLE placements
    ADD COLUMN rest_days_per_week integer NOT NULL DEFAULT 1;
