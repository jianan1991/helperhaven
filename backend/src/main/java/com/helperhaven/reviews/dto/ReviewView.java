package com.helperhaven.reviews.dto;

import com.helperhaven.domain.enums.EnglishLevel;
import com.helperhaven.domain.enums.ReviewKind;
import com.helperhaven.domain.enums.ReviewVisibility;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read projection of a {@link com.helperhaven.domain.Review}. {@code reviewerName}
 * and {@code reviewerPhotoUrl} are hydrated server-side so the UI doesn't need to
 * stitch profiles together itself.
 */
public record ReviewView(
        UUID id,
        UUID reviewerUserId,
        String reviewerName,
        String reviewerPhotoUrl,
        UUID revieweeUserId,
        ReviewKind kind,
        ReviewVisibility visibility,
        int rating,
        String body,
        Map<String, Integer> skillBreakdown,
        List<String> flagTags,
        EnglishLevel englishLevel,
        Integer monthsIntoContract,
        Instant createdAt
) {}
