-- ============================================================
-- V4 · Helper self-reported past experience
-- ------------------------------------------------------------
-- Helpers write up their own work history (prior households,
-- countries, duties). NOT validated by the platform — displayed
-- to employers with a clear "Self-reported" label.
--
-- Endorsement / invite-past-employer flow is deliberately NOT
-- built here. If we add verification later it goes in a separate
-- table so the trust boundary stays clean.
-- ============================================================

-- helper_profiles uses user_id as PK (no separate id column), so we FK on user_id.
CREATE TABLE helper_experiences (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    helper_user_id          uuid        NOT NULL REFERENCES helper_profiles(user_id) ON DELETE CASCADE,

    -- Where
    country_code            char(2)     NOT NULL,                       -- ISO 3166-1 alpha-2: SG, HK, MY, SA, AE, TW, ID, MM, PH …
    city                    varchar(80),

    -- When
    start_date              date        NOT NULL,
    end_date                date,                                        -- NULL = still working there
    is_current              boolean     NOT NULL DEFAULT false,

    -- What
    household_description   text,                                        -- free-text: "Chinese family, couple + 2 kids (4 & 7) + ah-ma"
    duties                  text[]      NOT NULL DEFAULT '{}',           -- ['INFANT_CARE','COOKING_CHINESE','SCHOOL_RUN','ELDERLY_CARE']
    languages_used          text[]      NOT NULL DEFAULT '{}',           -- ['EN','ZH','MS']
    reason_for_leaving      varchar(60),                                 -- 'CONTRACT_ENDED' | 'FAMILY_RELOCATED' | 'RETURNED_HOME' | 'OTHER'
    description             text,                                        -- helper's own narrative

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT helper_experiences_dates_valid
        CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT helper_experiences_current_has_no_end
        CHECK (is_current = false OR end_date IS NULL)
);

CREATE INDEX idx_helper_experiences_profile
    ON helper_experiences(helper_user_id, start_date DESC);

CREATE INDEX idx_helper_experiences_country
    ON helper_experiences(country_code);

COMMENT ON TABLE helper_experiences IS
    'Helper self-reported work history. Unverified — display with "Self-reported" label. '
    'Do not conflate with reviews (reviews.permit_case_id FK → contract-gated trust).';
