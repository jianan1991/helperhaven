package com.helperhaven.profile.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Five-metric vector used by both the helper's self-rated skill scores and the
 * employer's preference weights. Sprint A's match score is the dot product of
 * the two. Each component is 0..100; the sum-to-100 invariant is checked at
 * the service layer (cheaper than a CHECK trigger; surfaces a clean error).
 */
public record FiveVector(
        @NotNull @Min(0) @Max(100) Integer infant,
        @NotNull @Min(0) @Max(100) Integer elderly,
        @NotNull @Min(0) @Max(100) Integer cooking,
        @NotNull @Min(0) @Max(100) Integer house,
        @NotNull @Min(0) @Max(100) Integer attitude
) {
    public int sum() {
        return infant + elderly + cooking + house + attitude;
    }
}
