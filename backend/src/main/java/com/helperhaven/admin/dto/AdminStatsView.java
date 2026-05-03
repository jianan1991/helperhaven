package com.helperhaven.admin.dto;

public record AdminStatsView(
        long totalUsers,
        long employers,
        long helpers,
        long conversations,
        long placements,
        long helperProfiles,
        long employerProfiles
) {}
