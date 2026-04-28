package com.helperhaven.profile.dto;

import com.helperhaven.domain.enums.HousingType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EmployerProfileRequest(
        @Size(max = 200) String fullName,
        @NotNull @Positive Integer householdSize,
        @NotNull @PositiveOrZero Integer numChildren,
        @NotNull @PositiveOrZero Integer numElderly,
        @NotNull Boolean hasPets,
        @NotNull HousingType housing,
        String district,
        Integer salaryOfferSgdMin,
        Integer salaryOfferSgdMax,
        String offDayPolicy,
        String hiringPurpose,
        List<String> purposeTags,
        @NotNull @Valid FiveVector weights
) {}
