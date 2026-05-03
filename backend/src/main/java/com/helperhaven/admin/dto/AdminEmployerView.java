package com.helperhaven.admin.dto;

import java.util.UUID;

public record AdminEmployerView(
        UUID userId,
        String email,
        String fullName,
        String housing,
        String district,
        Integer householdSize,
        Integer numChildren,
        Integer numElderly,
        Boolean hasPets,
        Integer salaryOfferSgdMin,
        Integer salaryOfferSgdMax,
        String hiringPurpose,
        String status
) {}
