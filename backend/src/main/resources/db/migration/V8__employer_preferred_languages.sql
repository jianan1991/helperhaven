-- V8 · Add preferred_languages array column
-- Note: preferred_language was never added via a migration (only via Hibernate DDL),
-- so there is no data to migrate. We just add the new column and drop the old one if present.
ALTER TABLE employer_profiles
    ADD COLUMN IF NOT EXISTS preferred_languages text[] NOT NULL DEFAULT '{}';

ALTER TABLE employer_profiles DROP COLUMN IF EXISTS preferred_language;
