package com.helperhaven.permits.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MarkHiredRequest(
        @NotNull UUID counterpartyUserId
) {}
