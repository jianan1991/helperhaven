package com.helperhaven.permits.dto;

import com.helperhaven.domain.enums.PermitStatus;

import java.util.UUID;

/**
 * Minimal projection of a permit case — Sprint A's demo only needs the IDs and
 * status to drive the "Write review" CTA visibility.
 */
public record PermitCaseView(
        UUID id,
        UUID employerUserId,
        UUID helperUserId,
        PermitStatus status,
        boolean reviewsUnlocked
) {}
