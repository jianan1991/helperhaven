package com.helperhaven.profile.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.helperhaven.domain.HelperLanguage;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.enums.Nationality;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record HelperProfileResponse(
        UUID userId,
        String displayFirstName,
        String fullName,
        Nationality nationality,
        LocalDate dateOfBirth,
        Integer yearsExperience,
        String religion,
        String maritalStatus,
        String education,
        String bio,
        Integer heightCm,
        Integer weightKg,
        Boolean willingLiveIn,
        Boolean comfortableWithChildren,
        Boolean comfortableWithPets,
        Boolean halal,
        String allergies,
        Integer expectedSalarySgd,
        LocalDate availableFrom,
        String currentLocation,
        String offDayPolicy,
        String photoUrl,
        FiveVector skills,
        List<LanguageProficiency> languages,
        boolean availableForTransfer,
        LocalDate transferAvailableFrom,
        List<WorkEntryDto> workHistory
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record LanguageProficiency(Short languageId, Short proficiency) {}

    /**
     * Returns a copy with {@code photoUrl} replaced. Used by the service layer
     * to swap the stored object-storage key for a fresh short-TTL signed URL
     * before handing the response to the controller.
     */
    public HelperProfileResponse withPhotoUrl(String newPhotoUrl) {
        return new HelperProfileResponse(
                userId, displayFirstName, fullName, nationality, dateOfBirth,
                yearsExperience, religion, maritalStatus, education, bio,
                heightCm, weightKg, willingLiveIn,
                comfortableWithChildren, comfortableWithPets, halal, allergies,
                expectedSalarySgd, availableFrom, currentLocation, offDayPolicy, newPhotoUrl,
                skills, languages, availableForTransfer, transferAvailableFrom,
                workHistory
        );
    }

    public static HelperProfileResponse from(HelperProfile p, List<HelperLanguage> langs) {
        return new HelperProfileResponse(
                p.getUserId(),
                p.getDisplayFirstName(),
                p.getFullName(),
                p.getNationality(),
                p.getDateOfBirth(),
                p.getYearsExperience() == null ? null : p.getYearsExperience().intValue(),
                p.getReligion(),
                p.getMaritalStatus(),
                p.getEducation(),
                p.getBio(),
                p.getHeightCm() == null ? null : p.getHeightCm().intValue(),
                p.getWeightKg() == null ? null : p.getWeightKg().intValue(),
                p.getWillingLiveIn(),
                Boolean.TRUE.equals(p.getComfortableWithChildren()),
                Boolean.TRUE.equals(p.getComfortableWithPets()),
                Boolean.TRUE.equals(p.getHalal()),
                p.getAllergies(),
                p.getExpectedSalarySgd(),
                p.getAvailableFrom(),
                p.getCurrentLocation(),
                p.getOffDayPolicy(),
                p.getPhotoUrl(),
                new FiveVector(
                        nz(p.getScoreInfant()),
                        nz(p.getScoreElderly()),
                        nz(p.getScoreCooking()),
                        nz(p.getScoreHouse()),
                        nz(p.getScoreAttitude())
                ),
                langs.stream()
                        .map(l -> new LanguageProficiency(l.getId().getLanguageId(), l.getProficiency()))
                        .toList(),
                Boolean.TRUE.equals(p.getAvailableForTransfer()),
                p.getTransferAvailableFrom(),
                parseWorkHistory(p.getWorkHistory())
        );
    }

    private static List<WorkEntryDto> parseWorkHistory(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private static int nz(Short s) { return s == null ? 0 : s.intValue(); }
}
