package com.helperhaven.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "helperhaven")
public record AppProperties(
        Auth auth,
        Storage storage,
        Stripe stripe,
        Matching matching,
        Sybil sybil
) {
    public record Auth(Jwt jwt) {}

    public record Jwt(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {}

    public record Storage(
            String provider,
            String bucket,
            String region,
            String endpoint,
            String accessKey,
            String secretKey,
            boolean pathStyleAccess
    ) {}

    public record Stripe(String secretKey, String webhookSecret) {}

    /**
     * Timing rules for the chat-first matching flow.
     * - unlockExpiryHours: total lifetime of an unlock_request before it's closed.
     * - chatRefundHours: if the helper has not sent a first reply within this
     *   window, the credit auto-refunds to the employer.
     * - chatThreadExpiryDays: inactive chat threads close after this many days.
     */
    public record Matching(int unlockExpiryHours, int chatRefundHours, int chatThreadExpiryDays) {}

    public record Sybil(int maxSignupsPerIp24h, boolean requireKycBeforeVisibility) {}
}
