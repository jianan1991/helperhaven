package com.helperhaven.profile.dto;

import com.helperhaven.domain.enums.Nationality;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Upsert payload for a helper profile. Required fields mirror the V1
 * NOT-NULL columns; everything else is optional and can be filled in later.
 */
public record HelperProfileRequest(
        @NotBlank @Size(max = 80) String displayFirstName,
        @Size(max = 200) String fullName,
        @NotNull Nationality nationality,
        @NotNull @Past LocalDate dateOfBirth,
        @NotNull @PositiveOrZero Integer yearsExperience,
        String religion,
        String maritalStatus,
        String education,
        String bio,
        Integer heightCm,
        Integer weightKg,
        @NotNull Boolean willingLiveIn,
        Integer expectedSalarySgd,
        LocalDate availableFrom,
        String currentLocation,
        String photoUrl,
        @NotNull @Valid FiveVector skills,
        /** ISO codes of languages the helper speaks (mapped via Language.iso_code). */
        List<HelperLanguageEntry> languages
) {
    public record HelperLanguageEntry(@NotNull Short languageId, @NotNull Short proficiency) {}
}
