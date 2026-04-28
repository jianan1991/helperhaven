package com.helperhaven.wallet.dto;

import java.util.UUID;

/**
 * Response from {@code POST /api/unlocks}. {@code charged=true} means we just
 * burned a credit; {@code false} means the caller had already unlocked this
 * conversation (or is a non-employer who doesn't pay) — useful for the UI to
 * suppress a "−1 credit" toast on subsequent clicks.
 */
public record UnlockView(
        UUID conversationId,
        UUID counterpartyUserId,
        int balanceAfter,
        boolean charged
) {}
