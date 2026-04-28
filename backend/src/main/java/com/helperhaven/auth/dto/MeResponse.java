package com.helperhaven.auth.dto;

import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;

import java.util.UUID;

/**
 * Minimal user shape the frontend reads on every authenticated app render.
 * Anything sensitive (passwordHash, IPs, KYC blobs) stays server-side.
 */
public record MeResponse(
        UUID id,
        String email,
        UserRole role,
        UserStatus status,
        String locale,
        boolean emailVerified
) {
    public static MeResponse from(User u) {
        return new MeResponse(
                u.getId(),
                u.getEmail(),
                u.getRole(),
                u.getStatus(),
                u.getLocale(),
                u.getEmailVerifiedAt() != null
        );
    }
}
