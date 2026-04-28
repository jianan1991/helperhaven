-- HelperHaven baseline schema
-- Postgres 16+. All PKs are UUIDv7 generated application-side.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE user_role       AS ENUM ('EMPLOYER', 'HELPER', 'AGENCY', 'ADMIN');
CREATE TYPE user_status     AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE housing_type    AS ENUM ('HDB', 'CONDO', 'LANDED');
CREATE TYPE nationality_t   AS ENUM ('IDN', 'MMR', 'PHL', 'OTHER');
CREATE TYPE sponsorship_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE job_status      AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'CLOSED');
CREATE TYPE payment_status  AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TYPE payment_kind    AS ENUM ('CREDIT_PURCHASE', 'CONCIERGE_FEE');
CREATE TYPE payment_provider AS ENUM ('STRIPE', 'PAYNOW');
CREATE TYPE credit_reason   AS ENUM ('PURCHASE', 'UNLOCK_RESERVE', 'UNLOCK_BURN', 'UNLOCK_RELEASE', 'ADMIN_ADJUST', 'REFUND');
CREATE TYPE unlock_status   AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COMPLETED');
CREATE TYPE room_status     AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'EXPIRED', 'CANCELLED');
CREATE TYPE kyc_provider    AS ENUM ('SUMSUB', 'ONFIDO', 'IDANALYZER', 'INTERNAL');
CREATE TYPE kyc_doc_type    AS ENUM ('PASSPORT', 'NATIONAL_ID', 'SELFIE', 'LIVENESS');
CREATE TYPE kyc_status      AS ENUM ('PENDING', 'PASSED', 'REVIEW', 'FAILED');
CREATE TYPE hash_type       AS ENUM ('PASSPORT', 'NATIONAL_ID');
CREATE TYPE document_type   AS ENUM ('PASSPORT', 'NATIONAL_ID', 'SELFIE', 'WORK_REFERENCE', 'CERTIFICATE', 'CONSENT_FORM', 'IPA_LETTER', 'INSURANCE_POLICY', 'SECURITY_BOND', 'OTHER');
CREATE TYPE document_status AS ENUM ('UPLOADED', 'VERIFIED', 'REJECTED');
CREATE TYPE signal_type     AS ENUM ('DUPLICATE_DEVICE', 'VPN', 'VELOCITY', 'LIVENESS_FAIL', 'DUP_PHOTO', 'BEHAVIOR');
CREATE TYPE signal_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE signal_resolution AS ENUM ('DISMISSED', 'SUSPENDED', 'BANNED');
CREATE TYPE conversation_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE permit_status  AS ENUM ('DRAFT', 'DOCS_PENDING', 'SUBMITTED_MOM', 'INTERIM_APPROVED', 'BOND_INSURANCE', 'IPA_ISSUED', 'AWAITING_ARRIVAL', 'ARRIVED', 'SIP_DONE', 'MEDICAL_DONE', 'BIOMETRICS_DONE', 'CARD_ISSUED', 'CANCELLED', 'REJECTED');
CREATE TYPE permit_doc_role AS ENUM ('EMPLOYER_INCOME', 'HELPER_PASSPORT', 'HELPER_CONSENT', 'IPA_LETTER', 'BOND_RECEIPT', 'INSURANCE', 'MEDICAL_CERT', 'OTHER');
CREATE TYPE milestone_type  AS ENUM ('SECURITY_BOND', 'INSURANCE', 'SIP_REGISTRATION', 'HELPER_ARRIVAL', 'SIP_ATTENDANCE', 'MEDICAL_EXAM', 'BIOMETRICS', 'CARD_COLLECTION');
CREATE TYPE invoice_status  AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOIDED', 'REFUNDED');
CREATE TYPE review_context  AS ENUM ('MEETING', 'PLACEMENT');
CREATE TYPE review_visibility AS ENUM ('PUBLIC', 'PRIVATE', 'ADMIN_ONLY');
CREATE TYPE report_reason   AS ENUM ('SCAM', 'INAPPROPRIATE', 'FAKE_PROFILE', 'OFF_PLATFORM_PAYMENT', 'OTHER');
CREATE TYPE report_status   AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- ============================================================
-- Identity
-- ============================================================
CREATE TABLE users (
    id              uuid PRIMARY KEY,
    email           citext UNIQUE,
    phone_e164      varchar(20) UNIQUE,
    password_hash   varchar(255) NOT NULL,
    role            user_role NOT NULL,
    status          user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    locale          varchar(10) NOT NULL DEFAULT 'en',
    email_verified_at timestamptz,
    phone_verified_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_login_at   timestamptz,
    CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)
);
CREATE INDEX idx_users_role_status ON users(role, status);

CREATE TABLE employer_profiles (
    user_id              uuid PRIMARY KEY REFERENCES users(id),
    full_name_enc        bytea NOT NULL,
    household_size       smallint NOT NULL CHECK (household_size > 0),
    num_children         smallint NOT NULL DEFAULT 0,
    num_elderly          smallint NOT NULL DEFAULT 0,
    has_pets             boolean NOT NULL DEFAULT false,
    housing              housing_type NOT NULL,
    district             varchar(80),
    salary_offer_sgd_min integer,
    salary_offer_sgd_max integer,
    off_day_policy       varchar(40),
    preferences          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE helper_profiles (
    user_id               uuid PRIMARY KEY REFERENCES users(id),
    display_first_name    varchar(80) NOT NULL,
    full_name_enc         bytea NOT NULL,
    nationality           nationality_t NOT NULL,
    date_of_birth         date NOT NULL,
    years_experience      smallint NOT NULL DEFAULT 0,
    religion              varchar(40),
    marital_status        varchar(20),
    education             varchar(60),
    bio                   text,
    height_cm             smallint,
    weight_kg             smallint,
    dietary_restrictions  jsonb NOT NULL DEFAULT '{}'::jsonb,
    willing_live_in       boolean NOT NULL DEFAULT true,
    expected_salary_sgd   integer,
    available_from        date,
    current_location      varchar(80),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_helper_nationality ON helper_profiles(nationality);

CREATE TABLE agency_profiles (
    user_id                 uuid PRIMARY KEY REFERENCES users(id),
    company_name            varchar(200) NOT NULL,
    mom_ea_licence_number   varchar(40) NOT NULL UNIQUE,
    licence_expiry          date NOT NULL,
    uen                     varchar(20),
    address                 text,
    contact_person          varchar(120),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agency_sponsorships (
    id                uuid PRIMARY KEY,
    helper_user_id    uuid NOT NULL REFERENCES users(id),
    agency_user_id    uuid NOT NULL REFERENCES users(id),
    status            sponsorship_status NOT NULL DEFAULT 'ACTIVE',
    started_at        timestamptz NOT NULL DEFAULT now(),
    ended_at          timestamptz
);
CREATE UNIQUE INDEX uq_sponsorship_one_active
    ON agency_sponsorships(helper_user_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_sponsorship_agency ON agency_sponsorships(agency_user_id);

-- ============================================================
-- Skills & Languages
-- ============================================================
CREATE TABLE skill_categories (
    id            smallint PRIMARY KEY,
    code          varchar(40) NOT NULL UNIQUE,
    display_name  varchar(120) NOT NULL,
    sort_order    smallint NOT NULL DEFAULT 100,
    is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE languages (
    id            smallint PRIMARY KEY,
    iso_code      varchar(10) NOT NULL UNIQUE,
    display_name  varchar(80) NOT NULL,
    is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE helper_skills (
    helper_user_id  uuid NOT NULL REFERENCES users(id),
    skill_id        smallint NOT NULL REFERENCES skill_categories(id),
    rating          smallint NOT NULL CHECK (rating BETWEEN 0 AND 100),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (helper_user_id, skill_id)
);

CREATE TABLE helper_languages (
    helper_user_id  uuid NOT NULL REFERENCES users(id),
    language_id     smallint NOT NULL REFERENCES languages(id),
    proficiency     smallint NOT NULL CHECK (proficiency BETWEEN 0 AND 100),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (helper_user_id, language_id)
);

CREATE TABLE job_posts (
    id                 uuid PRIMARY KEY,
    employer_user_id   uuid NOT NULL REFERENCES users(id),
    title              varchar(200) NOT NULL,
    description        text,
    status             job_status NOT NULL DEFAULT 'DRAFT',
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    filled_at          timestamptz
);
CREATE INDEX idx_job_posts_employer ON job_posts(employer_user_id);
CREATE INDEX idx_job_posts_status ON job_posts(status);

CREATE TABLE job_post_requirements (
    job_post_id      uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    skill_id         smallint NOT NULL REFERENCES skill_categories(id),
    required_rating  smallint NOT NULL CHECK (required_rating BETWEEN 0 AND 100),
    weight           smallint NOT NULL DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
    PRIMARY KEY (job_post_id, skill_id)
);

CREATE TABLE job_post_languages (
    job_post_id            uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    language_id            smallint NOT NULL REFERENCES languages(id),
    required_proficiency   smallint NOT NULL CHECK (required_proficiency BETWEEN 0 AND 100),
    PRIMARY KEY (job_post_id, language_id)
);

-- ============================================================
-- Matching
-- ============================================================
CREATE TABLE matches (
    id                uuid PRIMARY KEY,
    job_post_id       uuid NOT NULL REFERENCES job_posts(id),
    helper_user_id    uuid NOT NULL REFERENCES users(id),
    score             numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    factors           jsonb NOT NULL DEFAULT '{}'::jsonb,
    computed_at       timestamptz NOT NULL DEFAULT now(),
    stale_at          timestamptz,
    UNIQUE (job_post_id, helper_user_id)
);
CREATE INDEX idx_matches_helper ON matches(helper_user_id);
CREATE INDEX idx_matches_score ON matches(job_post_id, score DESC);

-- ============================================================
-- Credits & Payments
-- ============================================================
CREATE TABLE credit_wallets (
    user_id     uuid PRIMARY KEY REFERENCES users(id),
    balance     integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
    reserved    integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credit_packages (
    id                smallint PRIMARY KEY,
    code              varchar(40) NOT NULL UNIQUE,
    role              user_role NOT NULL CHECK (role IN ('EMPLOYER', 'HELPER')),
    credits           integer NOT NULL CHECK (credits > 0),
    price_sgd_cents   integer NOT NULL CHECK (price_sgd_cents > 0),
    is_active         boolean NOT NULL DEFAULT true
);

CREATE TABLE payments (
    id                uuid PRIMARY KEY,
    user_id           uuid NOT NULL REFERENCES users(id),
    package_id        smallint REFERENCES credit_packages(id),
    kind              payment_kind NOT NULL,
    amount_sgd_cents  integer NOT NULL CHECK (amount_sgd_cents > 0),
    currency          varchar(3) NOT NULL DEFAULT 'SGD',
    provider          payment_provider NOT NULL,
    provider_ref      varchar(120),
    status            payment_status NOT NULL DEFAULT 'PENDING',
    created_at        timestamptz NOT NULL DEFAULT now(),
    settled_at        timestamptz
);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_provider_ref ON payments(provider_ref);

CREATE TABLE credit_transactions (
    id              uuid PRIMARY KEY,
    wallet_user_id  uuid NOT NULL REFERENCES credit_wallets(user_id),
    delta           integer NOT NULL,
    reason          credit_reason NOT NULL,
    reference_type  varchar(40),
    reference_id    uuid,
    balance_after   integer NOT NULL CHECK (balance_after >= 0),
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_txn_wallet ON credit_transactions(wallet_user_id, created_at DESC);

-- ============================================================
-- Unlock + Video
-- ============================================================
CREATE TABLE unlock_requests (
    id                          uuid PRIMARY KEY,
    match_id                    uuid NOT NULL REFERENCES matches(id),
    initiator_user_id           uuid NOT NULL REFERENCES users(id),
    counterparty_user_id        uuid NOT NULL REFERENCES users(id),
    initiator_credit_txn_id     uuid REFERENCES credit_transactions(id),
    counterparty_credit_txn_id  uuid REFERENCES credit_transactions(id),
    status                      unlock_status NOT NULL DEFAULT 'PENDING',
    created_at                  timestamptz NOT NULL DEFAULT now(),
    expires_at                  timestamptz NOT NULL,
    accepted_at                 timestamptz
);
CREATE INDEX idx_unlock_match ON unlock_requests(match_id);
CREATE INDEX idx_unlock_counterparty ON unlock_requests(counterparty_user_id, status);

CREATE TABLE video_rooms (
    id                 uuid PRIMARY KEY,
    unlock_request_id  uuid NOT NULL UNIQUE REFERENCES unlock_requests(id),
    livekit_room_name  varchar(120) NOT NULL UNIQUE,
    scheduled_at       timestamptz,
    started_at         timestamptz,
    ended_at           timestamptz,
    status             room_status NOT NULL DEFAULT 'SCHEDULED',
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE video_participants (
    id                  uuid PRIMARY KEY,
    room_id             uuid NOT NULL REFERENCES video_rooms(id),
    user_id             uuid NOT NULL REFERENCES users(id),
    joined_at           timestamptz NOT NULL,
    left_at             timestamptz,
    connection_quality  jsonb
);
CREATE INDEX idx_video_part_room ON video_participants(room_id);

CREATE TABLE meeting_attendance (
    room_id          uuid PRIMARY KEY REFERENCES video_rooms(id),
    overlap_seconds  integer NOT NULL DEFAULT 0,
    threshold_met    boolean NOT NULL DEFAULT false,
    credits_burned   boolean NOT NULL DEFAULT false,
    resolved_at      timestamptz
);

-- ============================================================
-- Verification & Trust
-- ============================================================
CREATE TABLE verification_records (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES users(id),
    provider        kyc_provider NOT NULL,
    document_type   kyc_doc_type NOT NULL,
    status          kyc_status NOT NULL,
    decision_at     timestamptz,
    raw_response    jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_user ON verification_records(user_id, created_at DESC);

CREATE TABLE document_hashes (
    id            uuid PRIMARY KEY,
    hash_sha256   bytea NOT NULL UNIQUE,
    hash_type     hash_type NOT NULL,
    user_id       uuid NOT NULL REFERENCES users(id),
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_hash_user ON document_hashes(user_id);

CREATE TABLE documents (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL REFERENCES users(id),
    type          document_type NOT NULL,
    s3_key        varchar(500) NOT NULL,
    mime_type     varchar(100) NOT NULL,
    size_bytes    bigint NOT NULL CHECK (size_bytes >= 0),
    sha256        bytea,
    status        document_status NOT NULL DEFAULT 'UPLOADED',
    uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_user_type ON documents(user_id, type);

CREATE TABLE trust_scores (
    user_id     uuid PRIMARY KEY REFERENCES users(id),
    score       numeric(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    factors     jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fraud_signals (
    id                  uuid PRIMARY KEY,
    user_id             uuid REFERENCES users(id),
    device_fingerprint  varchar(200),
    ip_address          inet,
    signal_type         signal_type NOT NULL,
    severity            signal_severity NOT NULL,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    resolution          signal_resolution,
    resolved_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fraud_signals_user ON fraud_signals(user_id);
CREATE INDEX idx_fraud_signals_device ON fraud_signals(device_fingerprint);

-- ============================================================
-- Messaging
-- ============================================================
CREATE TABLE conversations (
    id                 uuid PRIMARY KEY,
    unlock_request_id  uuid NOT NULL UNIQUE REFERENCES unlock_requests(id),
    user_a_id          uuid NOT NULL REFERENCES users(id),
    user_b_id          uuid NOT NULL REFERENCES users(id),
    status             conversation_status NOT NULL DEFAULT 'OPEN',
    created_at         timestamptz NOT NULL DEFAULT now(),
    last_message_at    timestamptz
);
CREATE INDEX idx_conversations_ab ON conversations(user_a_id, user_b_id);

CREATE TABLE messages (
    id              uuid PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id),
    sender_user_id  uuid NOT NULL REFERENCES users(id),
    body            text NOT NULL,
    sent_at         timestamptz NOT NULL DEFAULT now(),
    read_at         timestamptz
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, sent_at);

-- ============================================================
-- Work Permit Concierge
-- ============================================================
CREATE TABLE permit_cases (
    id                      uuid PRIMARY KEY,
    employer_user_id        uuid NOT NULL REFERENCES users(id),
    helper_user_id          uuid NOT NULL REFERENCES users(id),
    match_id                uuid REFERENCES matches(id),
    status                  permit_status NOT NULL DEFAULT 'DRAFT',
    mom_reference_number    varchar(60),
    security_bond_ref       varchar(60),
    insurance_policy_ref    varchar(60),
    assigned_admin_user_id  uuid REFERENCES users(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_permit_status ON permit_cases(status);
CREATE INDEX idx_permit_employer ON permit_cases(employer_user_id);
CREATE INDEX idx_permit_helper ON permit_cases(helper_user_id);

CREATE TABLE permit_documents (
    id            uuid PRIMARY KEY,
    case_id       uuid NOT NULL REFERENCES permit_cases(id),
    document_id   uuid NOT NULL REFERENCES documents(id),
    role          permit_doc_role NOT NULL,
    uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_permit_docs_case ON permit_documents(case_id);

CREATE TABLE permit_milestones (
    id              uuid PRIMARY KEY,
    case_id         uuid NOT NULL REFERENCES permit_cases(id),
    milestone_type  milestone_type NOT NULL,
    due_at          timestamptz,
    completed_at    timestamptz,
    notes           text
);
CREATE INDEX idx_permit_milestones_case ON permit_milestones(case_id);

CREATE TABLE concierge_invoices (
    id                uuid PRIMARY KEY,
    case_id           uuid NOT NULL UNIQUE REFERENCES permit_cases(id),
    payment_id        uuid REFERENCES payments(id),
    amount_sgd_cents  integer NOT NULL CHECK (amount_sgd_cents > 0),
    status            invoice_status NOT NULL DEFAULT 'DRAFT',
    issued_at         timestamptz,
    paid_at           timestamptz
);

-- ============================================================
-- Reviews & Reports
-- ============================================================
CREATE TABLE reviews (
    id                 uuid PRIMARY KEY,
    reviewer_user_id   uuid NOT NULL REFERENCES users(id),
    reviewee_user_id   uuid NOT NULL REFERENCES users(id),
    context            review_context NOT NULL,
    reference_id       uuid,
    rating             smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body               text,
    visibility         review_visibility NOT NULL DEFAULT 'PUBLIC',
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_user_id);

CREATE TABLE reports (
    id                         uuid PRIMARY KEY,
    reporter_user_id           uuid NOT NULL REFERENCES users(id),
    subject_user_id            uuid NOT NULL REFERENCES users(id),
    reason                     report_reason NOT NULL,
    description                text,
    status                     report_status NOT NULL DEFAULT 'OPEN',
    handled_by_admin_user_id   uuid REFERENCES users(id),
    created_at                 timestamptz NOT NULL DEFAULT now(),
    resolved_at                timestamptz
);
CREATE INDEX idx_reports_subject ON reports(subject_user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ============================================================
-- Audit & Auth
-- ============================================================
CREATE TABLE refresh_tokens (
    id                  uuid PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES users(id),
    token_hash_sha256   bytea NOT NULL,
    device_fingerprint  varchar(200),
    expires_at          timestamptz NOT NULL,
    revoked_at          timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash_sha256);

CREATE TABLE audit_logs (
    id              uuid PRIMARY KEY,
    actor_user_id   uuid REFERENCES users(id),
    action          varchar(80) NOT NULL,
    target_type     varchar(40),
    target_id       uuid,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address      inet,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
