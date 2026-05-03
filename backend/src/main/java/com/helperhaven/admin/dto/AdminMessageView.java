package com.helperhaven.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminMessageView(
        UUID id,
        UUID senderUserId,
        String senderEmail,
        String senderDisplayName,
        String body,
        boolean hidden,
        Instant sentAt
) {}
