package com.helperhaven.placement.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.UUID;

public record CreatePlacementRequest(
        @NotBlank String mode,
        List<UUID> selectedServiceIds,
        java.time.LocalDate idealStartDate
) {}
