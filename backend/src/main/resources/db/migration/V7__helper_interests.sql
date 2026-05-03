-- Helper expresses interest in an employer (no credits, no chat).
-- employer_id FK points at users(id) not employer_profiles because we
-- want the record to survive profile deletion without orphans.
CREATE TABLE IF NOT EXISTS helper_interests (
    helper_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expressed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (helper_id, employer_id)
);

CREATE INDEX IF NOT EXISTS idx_interests_employer ON helper_interests(employer_id);
