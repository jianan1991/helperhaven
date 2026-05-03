package com.helperhaven.offer.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OfferRequest(
        @NotNull @Min(1) Integer salarySgd,
        String offDayPolicy
) {}
