-- V12 · Placement tracking — created when employer picks JWC or DIY after offer acceptance
CREATE TABLE IF NOT EXISTS placements (
    id               uuid PRIMARY KEY,
    offer_id         uuid NOT NULL REFERENCES offers(id),
    employer_id      uuid NOT NULL REFERENCES users(id),
    helper_id        uuid NOT NULL REFERENCES users(id),
    engagement_mode  varchar(10) NOT NULL,   -- JWC | DIY
    status           varchar(30) NOT NULL DEFAULT 'INITIATED',
    created_at       timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_placements_employer ON placements(employer_id);
CREATE INDEX IF NOT EXISTS idx_placements_helper   ON placements(helper_id);
