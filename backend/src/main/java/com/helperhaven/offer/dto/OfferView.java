package com.helperhaven.offer.dto;

import com.helperhaven.domain.Offer;

import java.time.Instant;
import java.util.UUID;

public record OfferView(
        UUID id,
        UUID conversationId,
        UUID createdByUserId,
        int salarySgd,
        String offDayPolicy,
        String status,
        UUID parentOfferId,
        Instant createdAt,
        Instant expiresAt
) {
    public static OfferView from(Offer o) {
        return new OfferView(
                o.getId(),
                o.getConversationId(),
                o.getCreatedByUserId(),
                o.getSalarySgd(),
                o.getOffDayPolicy(),
                o.getStatus().name(),
                o.getParentOfferId(),
                o.getCreatedAt(),
                o.getExpiresAt()
        );
    }
}
