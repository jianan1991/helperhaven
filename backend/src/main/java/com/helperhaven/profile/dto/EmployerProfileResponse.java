package com.helperhaven.profile.dto;

import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.enums.HousingType;

import java.util.List;
import java.util.UUID;

public record EmployerProfileResponse(
        UUID userId,
        String fullName,
        Integer householdSize,
        Integer numChildren,
        Integer numElderly,
        Boolean hasPets,
        HousingType housing,
        String district,
        Integer salaryOfferSgdMin,
        Integer salaryOfferSgdMax,
        String offDayPolicy,
        String preferredLanguage,
        String hiringPurpose,
        List<String> purposeTags,
        FiveVector weights
) {
    public static EmployerProfileResponse from(EmployerProfile p) {
        return new EmployerProfileResponse(
                p.getUserId(),
                p.getFullName(),
                p.getHouseholdSize() == null ? null : p.getHouseholdSize().intValue(),
                p.getNumChildren() == null ? null : p.getNumChildren().intValue(),
                p.getNumElderly() == null ? null : p.getNumElderly().intValue(),
                p.getHasPets(),
                p.getHousing(),
                p.getDistrict(),
                p.getSalaryOfferSgdMin(),
                p.getSalaryOfferSgdMax(),
                p.getOffDayPolicy(),
                p.getPreferredLanguage(),
                p.getHiringPurpose(),
                p.getPurposeTags() == null ? List.of() : List.of(p.getPurposeTags()),
                new FiveVector(
                        nz(p.getWeightInfant()),
                        nz(p.getWeightElderly()),
                        nz(p.getWeightCooking()),
                        nz(p.getWeightHouse()),
                        nz(p.getWeightAttitude())
                )
        );
    }

    private static int nz(Short s) { return s == null ? 0 : s.intValue(); }
}
