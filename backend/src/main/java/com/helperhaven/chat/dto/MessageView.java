package com.helperhaven.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record MessageView(
        UUID id,
        UUID conversationId,
        UUID senderUserId,
        String body,
        Instant sentAt,
        Instant readAt
) {}
