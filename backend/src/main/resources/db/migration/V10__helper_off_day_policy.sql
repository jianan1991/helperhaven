-- V10 · Off-day policy preference on helper profiles
ALTER TABLE helper_profiles
    ADD COLUMN IF NOT EXISTS off_day_policy varchar(500);
