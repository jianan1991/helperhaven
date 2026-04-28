-- ============================================================
-- V5 · Sprint A profile polish
-- ------------------------------------------------------------
-- Adds the bare minimum columns Sprint A's onboarding wizards
-- need on top of the V1 baseline:
--   * helper_profiles.photo_url            — single MinIO/S3 photo
--   * employer_profiles.hiring_purpose     — free text "why are you hiring"
--   * employer_profiles.purpose_tags       — structured tags (elderly_care, infant_care, etc.)
--   * employer_profiles.skill_weights      — 5-vector weights for matching (sums to 100)
--
-- The Sprint B work (helper profile state machine + anti-ghost
-- counter + questionnaire) lands in V6; this migration is
-- intentionally narrow to keep Sprint A demoable alone.
-- ============================================================

-- ----------------------------------------------------------------
-- helper_profiles · single photo URL
-- ----------------------------------------------------------------
ALTER TABLE helper_profiles
    ADD COLUMN IF NOT EXISTS photo_url varchar(500);

-- ----------------------------------------------------------------
-- employer_profiles · hiring purpose + 5-vector weights
-- ----------------------------------------------------------------
ALTER TABLE employer_profiles
    ADD COLUMN IF NOT EXISTS hiring_purpose text,
    ADD COLUMN IF NOT EXISTS purpose_tags   text[] NOT NULL DEFAULT '{}',
    -- 5-metric weight vector. Sum-to-100 is enforced in the service layer.
    -- Nullable here so existing rows (none in dev) don't break — service
    -- layer requires it before the profile is considered "complete".
    ADD COLUMN IF NOT EXISTS weight_infant   smallint CHECK (weight_infant   BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS weight_elderly  smallint CHECK (weight_elderly  BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS weight_cooking  smallint CHECK (weight_cooking  BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS weight_house    smallint CHECK (weight_house    BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS weight_attitude smallint CHECK (weight_attitude BETWEEN 0 AND 100);

-- ----------------------------------------------------------------
-- helper_profiles · 5-vector skill scores
-- ------------------------------------------------------------
-- We already have `helper_skills` keyed by skill_categories.id with
-- per-skill ratings, but Sprint A's match scoring uses a fixed
-- 5-metric vector (infant / elderly / cooking / house / attitude)
-- that the helper distributes 100 points across. Storing as named
-- columns keeps the dot-product calc trivial and the schema obvious.
-- ----------------------------------------------------------------
ALTER TABLE helper_profiles
    ADD COLUMN IF NOT EXISTS score_infant   smallint CHECK (score_infant   BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS score_elderly  smallint CHECK (score_elderly  BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS score_cooking  smallint CHECK (score_cooking  BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS score_house    smallint CHECK (score_house    BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS score_attitude smallint CHECK (score_attitude BETWEEN 0 AND 100);

-- ----------------------------------------------------------------
-- Relax full_name_enc — we don't have an at-rest encryption layer wired
-- yet (Sprint E hardening). Sprint A stores plaintext in `full_name`
-- for both employer and helper. The bytea column stays for forward
-- compatibility but nullable so wizard inserts succeed.
-- ----------------------------------------------------------------
ALTER TABLE employer_profiles ALTER COLUMN full_name_enc DROP NOT NULL;
ALTER TABLE helper_profiles   ALTER COLUMN full_name_enc DROP NOT NULL;

ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS full_name varchar(200);
ALTER TABLE helper_profiles   ADD COLUMN IF NOT EXISTS full_name varchar(200);
