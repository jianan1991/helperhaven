package com.helperhaven.placement.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PlacementView(
        UUID id,
        UUID offerId,
        UUID employerId,
        UUID helperId,
        String engagementMode,
        String status,
        String helperDisplayName,
        String helperPhotoUrl,
        String employerDisplayName,
        Instant employerDocsSubmittedAt,
        Instant helperDocsSubmittedAt,
        Instant createdAt,
        Instant updatedAt,
        List<SelectedServiceView> selectedServices,
        java.time.LocalDate idealStartDate,
        int memberDocCount
) {}
