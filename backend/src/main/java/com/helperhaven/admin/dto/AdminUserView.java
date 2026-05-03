package com.helperhaven.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminUserView(
        UUID id,
        String email,
        String phoneE164,
        String role,
        String status,
        Instant createdAt,
        Instant lastLoginAt,
        boolean emailVerified
) {}
