-- Per-stage timestamps so we can audit when each step was reached
ALTER TABLE placements
    ADD COLUMN initiated_at      timestamptz,
    ADD COLUMN docs_at           timestamptz,
    ADD COLUMN mom_submitted_at  timestamptz,
    ADD COLUMN ipa_issued_at     timestamptz,
    ADD COLUMN arrival_at        timestamptz,
    ADD COLUMN activated_at      timestamptz;

-- Backfill existing rows
UPDATE placements SET initiated_at = created_at WHERE initiated_at IS NULL;
UPDATE placements SET activated_at = updated_at  WHERE status = 'ACTIVE' AND activated_at IS NULL;
