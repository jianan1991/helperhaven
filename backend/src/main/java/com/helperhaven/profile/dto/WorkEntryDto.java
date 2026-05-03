package com.helperhaven.profile.dto;

import java.util.List;

public record WorkEntryDto(
        String id,
        String country,
        String location,
        String startDate,
        String endDate,
        boolean isCurrent,
        String description,
        List<String> duties,
        String leftBecause
) {}
