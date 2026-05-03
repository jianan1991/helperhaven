package com.helperhaven.admin.dto;

import java.time.LocalDate;
import java.util.UUID;

public record AdminHelperView(
        UUID userId,
        String email,
        String displayFirstName,
        String fullName,
        String nationality,
        Integer yearsExperience,
        Integer expectedSalarySgd,
        String currentLocation,
        LocalDate availableFrom,
        boolean willingLiveIn,
        boolean availableForTransfer,
        String status,
        String photoUrl
) {}
