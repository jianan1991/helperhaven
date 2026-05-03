package com.helperhaven.catalog.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ServicePriceRequest(
        @NotNull @Min(0) Integer priceSgd
) {}
