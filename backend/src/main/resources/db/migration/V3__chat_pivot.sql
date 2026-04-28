-- ============================================================
-- V3 · Chat-first pivot
-- ------------------------------------------------------------
-- Product changes driven by this migration:
--   * Drop video rooms entirely (chat-only from now on).
--   * Extend unlock_requests with 48-hour auto-refund window.
--   * Extend conversations with dual-side PII reveal + expiry.
--   * Extend messages with PII-redacted body.
--   * Reviews now require an active permit_case (contract gate)
--     and carry the 5-metric employer-verified breakdown plus
--     flag tags + English level.
--   * Leave & rest-day calendar (helper ↔ employer, two-way).
--   * Early-termination concierge flow with SG-transfer pool.
--   * Repriced credit packages (chat packs only, helpers free).
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Drop video subsystem
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS meeting_attendance;
DROP TABLE IF EXISTS video_participants;
DROP TABLE IF EXISTS video_rooms;
DROP TYPE  IF EXISTS room_status;

-- ----------------------------------------------------------------
-- 2. Chat: extend unlock_requests, conversations, messages
-- ----------------------------------------------------------------

-- unlock_requests: auto-refund after 48 h of helper non-reply
ALTER TABLE unlock_requests
    ADD COLUMN helper_first_reply_at timestamptz,
    ADD COLUMN auto_refund_at        timestamptz,  -- set = created_at + 48 h
    ADD COLUMN refunded_at           timestamptz,
    ADD COLUMN refund_reason         varchar(40);  -- 'AUTO_NO_REPLY' | 'MANUAL_EMPLOYER' | 'ADMIN'

-- Index we'll want for the daily sweep job that auto-refunds stale threads
CREATE INDEX idx_unlock_auto_refund_due
    ON unlock_requests(auto_refund_at)
    WHERE refunded_at IS NULL AND helper_first_reply_at IS NULL;

-- conversations: two-step contact reveal + expiry
ALTER TABLE conversations
    ADD COLUMN employer_shared_contact_at timestamptz,
    ADD COLUMN helper_shared_contact_at   timestamptz,
    ADD COLUMN pii_revealed_at            timestamptz, -- set when both have shared
    ADD COLUMN expires_at                 timestamptz; -- e.g., created_at + 30d inactivity

-- messages: store the redacted-for-display body alongside the raw one
-- Rationale: we keep the raw body for moderation/audit, but display the
-- redacted copy until both sides reveal contact. Redaction is done in the
-- app layer on INSERT.
ALTER TABLE messages
    ADD COLUMN redacted_body text,
    ADD COLUMN has_redactions boolean NOT NULL DEFAULT false,
    ADD COLUMN flagged boolean NOT NULL DEFAULT false;

-- Message-level reports (separate from user-level `reports` which still lives)
CREATE TABLE message_reports (
    id                     uuid PRIMARY KEY,
    message_id             uuid NOT NULL REFERENCES messages(id),
    reporter_user_id       uuid NOT NULL REFERENCES users(id),
    reason                 report_reason NOT NULL,
    description            text,
    status                 report_status NOT NULL DEFAULT 'OPEN',
    handled_by_admin_user_id uuid REFERENCES users(id),
    created_at             timestamptz NOT NULL DEFAULT now(),
    resolved_at            timestamptz
);
CREATE INDEX idx_message_reports_message ON message_reports(message_id);
CREATE INDEX idx_message_reports_status  ON message_reports(status);

-- ----------------------------------------------------------------
-- 3. Reviews v2: contract-gated, metric-breakdown, two-way
-- ----------------------------------------------------------------

-- Extra enums
CREATE TYPE review_kind   AS ENUM ('EMPLOYER_ON_HELPER', 'HELPER_ON_EMPLOYER');
CREATE TYPE english_level AS ENUM ('NONE', 'BASIC', 'CONVERSATIONAL', 'FLUENT');

-- Extend existing reviews table. Old rows (none yet in prod) get defaults.
ALTER TABLE reviews
    ADD COLUMN kind             review_kind,
    ADD COLUMN permit_case_id   uuid REFERENCES permit_cases(id),
    ADD COLUMN skill_breakdown  jsonb,      -- {"infant":33,"elderly":28,"cooking":18,"house":12,"attitude":9}
    ADD COLUMN flag_tags        text[] NOT NULL DEFAULT '{}', -- ['punctual','honest','patient','kind_to_elderly','willing_to_learn']
    ADD COLUMN english_level    english_level,
    ADD COLUMN months_into_contract integer CHECK (months_into_contract BETWEEN 0 AND 24),
    ADD COLUMN edited_at        timestamptz;

-- Gate: a published review must be tied to a permit_case that has reached
-- at least CARD_ISSUED. We enforce at the service layer (cheaper than a
-- cross-table CHECK), but also require the FK is set when visibility=PUBLIC.
ALTER TABLE reviews
    ADD CONSTRAINT reviews_public_requires_contract
    CHECK (visibility <> 'PUBLIC' OR permit_case_id IS NOT NULL);

-- One review per (reviewer, reviewee, permit_case, kind) — a given employer
-- can edit their review for one hiring, not spam multiple.
CREATE UNIQUE INDEX uq_review_one_per_contract
    ON reviews(reviewer_user_id, reviewee_user_id, permit_case_id, kind)
    WHERE permit_case_id IS NOT NULL;

CREATE INDEX idx_reviews_kind_reviewee ON reviews(kind, reviewee_user_id);
CREATE INDEX idx_reviews_permit_case   ON reviews(permit_case_id);

-- ----------------------------------------------------------------
-- 4. Helper transfer pool (already-in-SG helpers post-termination)
-- ----------------------------------------------------------------
ALTER TABLE helper_profiles
    ADD COLUMN in_sg_since               date,
    ADD COLUMN available_for_transfer    boolean NOT NULL DEFAULT false,
    ADD COLUMN transfer_available_from   date,
    ADD COLUMN current_employer_user_id  uuid REFERENCES users(id);

CREATE INDEX idx_helper_transfer_pool
    ON helper_profiles(transfer_available_from)
    WHERE available_for_transfer = true;

-- ----------------------------------------------------------------
-- 5. Permit state machine: early termination + transfer branch
-- ----------------------------------------------------------------
ALTER TYPE permit_status ADD VALUE IF NOT EXISTS 'TERMINATED_EARLY_PENDING';
ALTER TYPE permit_status ADD VALUE IF NOT EXISTS 'TERMINATED_EARLY_CLOSED';
ALTER TYPE permit_status ADD VALUE IF NOT EXISTS 'TRANSFER_PENDING';
ALTER TYPE permit_status ADD VALUE IF NOT EXISTS 'TRANSFER_CLOSED';

CREATE TYPE termination_initiator AS ENUM ('EMPLOYER', 'HELPER', 'MUTUAL', 'ADMIN');
CREATE TYPE termination_resolution AS ENUM (
    'PENDING',
    'TRANSFER_TO_NEW_EMPLOYER',  -- helper stays in SG, enters transfer pool
    'REPATRIATION',              -- helper flies home
    'HELPER_CANCELLED'           -- helper withdrew before resolution
);
CREATE TYPE bond_refund_status AS ENUM ('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

CREATE TABLE termination_cases (
    id                      uuid PRIMARY KEY,
    permit_case_id          uuid NOT NULL UNIQUE REFERENCES permit_cases(id),
    initiated_by            termination_initiator NOT NULL,
    initiator_user_id       uuid NOT NULL REFERENCES users(id),
    reason_code             varchar(40) NOT NULL,  -- e.g. 'FAMILY_CHANGE', 'PERFORMANCE', 'HEALTH', 'MUTUAL'
    reason_text             text,
    notice_date             date NOT NULL,
    final_work_date         date NOT NULL,
    resolution              termination_resolution NOT NULL DEFAULT 'PENDING',
    transfer_new_employer_user_id uuid REFERENCES users(id),
    repatriation_flight_ref varchar(80),
    repatriation_date       date,
    bond_refund_status      bond_refund_status NOT NULL DEFAULT 'PENDING',
    final_salary_sgd_cents  integer CHECK (final_salary_sgd_cents >= 0),
    mom_cancellation_ref    varchar(60),
    assigned_admin_user_id  uuid REFERENCES users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    closed_at               timestamptz
);
CREATE INDEX idx_termination_resolution ON termination_cases(resolution);
CREATE INDEX idx_termination_admin ON termination_cases(assigned_admin_user_id) WHERE closed_at IS NULL;

-- ----------------------------------------------------------------
-- 6. Leave & rest-day calendar
-- ----------------------------------------------------------------
CREATE TYPE leave_kind AS ENUM (
    'REST_DAY',        -- the weekly MOM-required rest day (or in-lieu comp)
    'PUBLIC_HOLIDAY',  -- auto-populated from SG PH list
    'ANNUAL',          -- contractual annual leave
    'MEDICAL',         -- certified MC
    'HOME_VISIT',      -- extended home-country leave
    'EMERGENCY',
    'EMPLOYER_AWAY',   -- employer marks "helper off" (family overseas etc.)
    'OTHER'
);

CREATE TYPE leave_status AS ENUM (
    'PENDING',         -- requested, awaiting approval
    'APPROVED',
    'DECLINED',
    'CANCELLED',
    'AUTO_APPROVED'    -- e.g. PH rows pre-seeded by the system
);

CREATE TYPE leave_requester AS ENUM ('HELPER', 'EMPLOYER', 'SYSTEM');

CREATE TABLE leave_requests (
    id                  uuid PRIMARY KEY,
    permit_case_id      uuid NOT NULL REFERENCES permit_cases(id),
    helper_user_id      uuid NOT NULL REFERENCES users(id),
    employer_user_id    uuid NOT NULL REFERENCES users(id),
    requested_by        leave_requester NOT NULL,
    kind                leave_kind NOT NULL,
    start_date          date NOT NULL,
    end_date            date NOT NULL CHECK (end_date >= start_date),
    reason              text,
    status              leave_status NOT NULL DEFAULT 'PENDING',
    decided_by_user_id  uuid REFERENCES users(id),
    decided_at          timestamptz,
    decline_reason      text,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leave_case_date ON leave_requests(permit_case_id, start_date);
CREATE INDEX idx_leave_pending ON leave_requests(status) WHERE status = 'PENDING';

CREATE TABLE leave_balances (
    permit_case_id       uuid NOT NULL REFERENCES permit_cases(id),
    balance_year         smallint NOT NULL,
    rest_days_entitled   smallint NOT NULL DEFAULT 52,   -- weekly rest day
    rest_days_taken      smallint NOT NULL DEFAULT 0,
    ph_entitled          smallint NOT NULL DEFAULT 11,   -- SG statutory PHs
    ph_taken             smallint NOT NULL DEFAULT 0,
    annual_entitled      smallint NOT NULL DEFAULT 14,   -- contractual; editable
    annual_taken         smallint NOT NULL DEFAULT 0,
    medical_taken        smallint NOT NULL DEFAULT 0,
    home_visit_taken     smallint NOT NULL DEFAULT 0,
    updated_at           timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (permit_case_id, balance_year),
    CHECK (rest_days_taken <= rest_days_entitled + 5),   -- tolerate minor over
    CHECK (annual_taken    <= annual_entitled + 5)
);

-- The recurring weekly rest-day rule. Written once per contract so we can
-- project PENDING rest-day rows forward into the calendar view.
CREATE TABLE rest_day_rules (
    permit_case_id     uuid PRIMARY KEY REFERENCES permit_cases(id),
    weekday            smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Mon
    compensation_in_lieu_sgd_cents integer,  -- if helper works rest day, this pay
    effective_from     date NOT NULL,
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Singapore public-holiday reference, seeded annually by admin/a job.
CREATE TABLE sg_public_holidays (
    holiday_date  date PRIMARY KEY,
    name          varchar(80) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 7. Credit package re-pricing (chat-only, employer-only)
-- ----------------------------------------------------------------
-- Wipe the V2 seed and replace with chat-pack tiers.
-- Note: credit_packages.id is smallint and the column is is_active (not active).
DELETE FROM credit_packages;

INSERT INTO credit_packages (id, code, role, credits, price_sgd_cents, is_active) VALUES
    (10, 'EMP_CHAT_5',   'EMPLOYER',  5,  1500,  true),   -- $15 for 5 chat unlocks
    (11, 'EMP_CHAT_15',  'EMPLOYER', 15,  4000,  true),   -- $40 for 15
    (12, 'EMP_CHAT_50',  'EMPLOYER', 50, 10000,  true);   -- $100 for 50 (agency tier)

-- ----------------------------------------------------------------
-- 8. credit_reason enum additions for refund clarity
-- ----------------------------------------------------------------
ALTER TYPE credit_reason ADD VALUE IF NOT EXISTS 'UNLOCK_REFUND_AUTO';   -- 48h no-reply sweep
ALTER TYPE credit_reason ADD VALUE IF NOT EXISTS 'UNLOCK_REFUND_MANUAL'; -- employer clicked refund

-- ----------------------------------------------------------------
-- 9. Seed a few SG public holidays for 2026 so the calendar has data
-- ----------------------------------------------------------------
INSERT INTO sg_public_holidays (holiday_date, name) VALUES
    ('2026-01-01', 'New Year''s Day'),
    ('2026-02-17', 'Chinese New Year'),
    ('2026-02-18', 'Chinese New Year'),
    ('2026-03-21', 'Hari Raya Puasa'),
    ('2026-04-03', 'Good Friday'),
    ('2026-05-01', 'Labour Day'),
    ('2026-05-27', 'Hari Raya Haji'),
    ('2026-05-31', 'Vesak Day'),
    ('2026-08-09', 'National Day'),
    ('2026-11-08', 'Deepavali'),
    ('2026-12-25', 'Christmas Day')
ON CONFLICT (holiday_date) DO NOTHING;
