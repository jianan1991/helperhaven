-- V9 · Work history for helpers (self-reported, stored as a JSON array)
ALTER TABLE helper_profiles
    ADD COLUMN IF NOT EXISTS work_history text NOT NULL DEFAULT '[]';
