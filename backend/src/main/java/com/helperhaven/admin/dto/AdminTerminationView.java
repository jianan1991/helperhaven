package com.helperhaven.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminTerminationView(
        UUID id,
        UUID placementId,
        String engagementMode,
        String employerName,
        String helperName,
        String reason,
        String status,
        String adminNotes,
        Instant createdAt,
        Instant resolvedAt
) {}
