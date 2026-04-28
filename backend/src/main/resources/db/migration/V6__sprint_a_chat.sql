-- ============================================================
-- V6 · Sprint A chat MVP
-- ------------------------------------------------------------
-- The V1 baseline modelled chat as the *consequence* of an
-- unlock_request: a conversation could only exist after credits
-- had been spent. Sprint A wants the demo to walk from match →
-- chat without yet wiring the credit ledger flow, so we relax
-- two things:
--
--   * conversations.unlock_request_id becomes nullable, with a
--     CHECK that flips to NOT NULL once unlock is built (Sprint
--     A.next slice). For now NULL = "direct chat, demo only".
--   * a unique pair index so we never end up with two open
--     conversations between the same employer/helper. We sort
--     the user IDs into (low, high) so the lookup is symmetric.
--
-- Read-receipt cursor lives on conversations as last_read_at_a/b
-- — keeping it on the conversation row means the unread-count
-- query is a single index scan instead of a LIMIT 1 subquery
-- per pair.
-- ============================================================

ALTER TABLE conversations
    ALTER COLUMN unlock_request_id DROP NOT NULL;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS last_read_at_a timestamptz,
    ADD COLUMN IF NOT EXISTS last_read_at_b timestamptz;

-- Symmetric uniqueness: at most one OPEN conversation per (helper, employer).
-- We use LEAST/GREATEST so swapping user_a_id and user_b_id still collides.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_pair_open
    ON conversations(LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
    WHERE status = 'OPEN';

-- Polling endpoint will hit this constantly: "messages since X for conversation Y".
-- The V1 idx_messages_conv covers (conversation_id, sent_at) which is what we need,
-- so no new index here — just leaving a note.
