package com.helperhaven.reviews.dto;

import com.helperhaven.domain.enums.EnglishLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sprint A review payload. The reviewer is always the calling user; the kind
 * (employer-on-helper vs helper-on-employer) is inferred from roles. We require
 * a {@code revieweeUserId} explicitly so the same payload works whether the
 * frontend has the permit case id or not.
 */
public record WriteReviewRequest(
        @NotNull UUID revieweeUserId,
        @Min(1) @Max(5) int rating,
        @Size(max = 2000) String body,
        // 5-vector breakdown of how the helper actually performed.
        // Keys are the canonical {infant, elderly, cooking, house, attitude} —
        // service validates the keyset and 0-100 range per entry.
        Map<String, Integer> skillBreakdown,
        // Optional tags from the canonical set: punctual, honest, patient,
        // kind_to_elderly, willing_to_learn. Service validates membership.
        List<String> flagTags,
        EnglishLevel englishLevel,
        @Min(0) @Max(36) Integer monthsIntoContract
) {}
