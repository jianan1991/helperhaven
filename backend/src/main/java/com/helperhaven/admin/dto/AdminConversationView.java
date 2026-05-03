package com.helperhaven.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminConversationView(
        UUID id,
        UUID userAId,
        String userAEmail,
        String userADisplayName,
        String userARole,
        UUID userBId,
        String userBEmail,
        String userBDisplayName,
        String userBRole,
        String status,
        int messageCount,
        Instant lastMessageAt,
        String lastMessagePreview,
        Instant createdAt
) {}
