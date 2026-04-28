package com.helperhaven.wallet.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UnlockRequest(
        @NotNull UUID counterpartyUserId
) {}
