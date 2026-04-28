package com.helperhaven.chat.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record OpenChatRequest(
        @NotNull UUID counterpartyUserId
) {}
