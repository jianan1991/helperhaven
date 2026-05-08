package com.helperhaven.admin.dto;

import com.helperhaven.placement.dto.SelectedServiceView;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminPlacementView(
        UUID id,
        UUID employerId,
        String employerEmail,
        String employerName,
        UUID helperId,
        String helperEmail,
        String helperName,
        String engagementMode,
        String status,
        Instant employerDocsSubmittedAt,
        Instant helperDocsSubmittedAt,
        Instant createdAt,
        Instant updatedAt,
        List<SelectedServiceView> selectedServices,
        java.time.LocalDate idealStartDate,
        int memberDocCount
) {}
