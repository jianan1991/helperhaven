package com.helperhaven.matches.dto;

import com.helperhaven.profile.dto.WorkEntryDto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One row in the matches list. Shape is symmetric across roles — what an
 * employer sees about a helper, and what a helper sees about an employer,
 * both fit this record. Optional fields are only populated for the relevant role.
 *
 * For employer viewing helper: bio is null until unlocked.
 * For helper viewing employer: bio holds the employer's hiringPurpose.
 */
public record MatchView(
        UUID counterpartyUserId,
        String displayName,
        String subtitle,            // helper: nationality;  employer: housing type
        Integer age,                // helper only
        Integer yearsExperience,    // helper only
        // Pre-unlock helper details (always visible to employer)
        Boolean willingLiveIn,
        Integer expectedSalarySgd,
        LocalDate availableFrom,
        String currentLocation,
        List<WorkEntryDto> workHistory,
        String photoUrl,            // helper only — fresh signed GET URL
        double score,               // 0..100
        List<String> reasons,       // top-3 5-vector keys driving the score
        Map<String, Integer> scores,// full 5-vector breakdown
        boolean unlocked,
        boolean interested,
        Instant interestExpiresAt,
        // Unlocked-only for helper; always set for employer (hiring purpose)
        String bio,
        Boolean comfortableWithChildren, // helper: null unless unlocked
        Boolean comfortableWithPets,
        Boolean halal,
        String allergies,
        // Employer-specific fields visible to helpers
        Integer householdSize,
        Integer numChildren,
        Integer numElderly,
        Boolean hasPets,
        String district,
        Integer salaryMin,
        Integer salaryMax,
        String offDayPolicy,
        List<String> preferredLanguages,
        List<String> purposeTags
) {}
