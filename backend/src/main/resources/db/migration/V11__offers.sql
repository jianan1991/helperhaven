-- V11 · Job offer negotiation between employer and helper
CREATE TABLE IF NOT EXISTS offers (
    id                  uuid PRIMARY KEY,
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    created_by_user_id  uuid NOT NULL REFERENCES users(id),
    salary_sgd          integer NOT NULL,
    off_day_policy      varchar(500),
    status              varchar(20) NOT NULL DEFAULT 'PENDING',
    parent_offer_id     uuid REFERENCES offers(id),
    created_at          timestamptz NOT NULL,
    expires_at          timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offers_conversation ON offers(conversation_id, created_at);
