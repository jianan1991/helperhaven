package com.helperhaven.offer;

import com.helperhaven.chat.ChatService;
import com.helperhaven.domain.Conversation;
import com.helperhaven.domain.Offer;
import com.helperhaven.domain.enums.OfferStatus;
import com.helperhaven.offer.dto.OfferView;
import com.helperhaven.repo.ConversationRepository;
import com.helperhaven.repo.OfferRepository;
import com.helperhaven.repo.PlacementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OfferService {

    private static final Duration OFFER_TTL = Duration.ofDays(7);

    private final OfferRepository offers;
    private final ConversationRepository conversations;
    private final PlacementRepository placements;
    private final ChatService chat;

    public OfferService(OfferRepository offers, ConversationRepository conversations,
                        PlacementRepository placements, ChatService chat) {
        this.offers = offers;
        this.conversations = conversations;
        this.placements = placements;
        this.chat = chat;
    }

    @Transactional(readOnly = true)
    public List<OfferView> list(UUID userId, UUID conversationId) {
        requireParticipant(userId, conversationId);
        return offers.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream().map(OfferView::from).toList();
    }

    @Transactional
    public OfferView create(UUID userId, UUID conversationId, int salarySgd, String offDayPolicy) {
        requireParticipant(userId, conversationId);
        requireNoActivePlacement(conversationId);
        Instant now = Instant.now();
        Offer offer = Offer.builder()
                .id(UUID.randomUUID())
                .conversationId(conversationId)
                .createdByUserId(userId)
                .salarySgd(salarySgd)
                .offDayPolicy(offDayPolicy)
                .status(OfferStatus.PENDING)
                .createdAt(now)
                .expiresAt(now.plus(OFFER_TTL))
                .build();
        offers.save(offer);
        chat.send(userId, conversationId, "OFFER:" + offer.getId());
        return OfferView.from(offer);
    }

    @Transactional
    public OfferView accept(UUID userId, UUID offerId) {
        Offer offer = requireResponder(userId, offerId);
        offer.setStatus(OfferStatus.ACCEPTED);
        String msg = "✅ Offer accepted — SGD " + offer.getSalarySgd() + "/month"
                + (offer.getOffDayPolicy() != null ? ", " + offer.getOffDayPolicy() : "");
        chat.send(userId, offer.getConversationId(), msg);
        return OfferView.from(offer);
    }

    @Transactional
    public OfferView reject(UUID userId, UUID offerId) {
        Offer offer = requireResponder(userId, offerId);
        offer.setStatus(OfferStatus.REJECTED);
        chat.send(userId, offer.getConversationId(), "❌ Offer declined.");
        return OfferView.from(offer);
    }

    @Transactional
    public OfferView counter(UUID userId, UUID offerId, int salarySgd, String offDayPolicy) {
        Offer parent = requireResponder(userId, offerId);
        requireNoActivePlacement(parent.getConversationId());
        parent.setStatus(OfferStatus.COUNTERED);

        Instant now = Instant.now();
        Offer counter = Offer.builder()
                .id(UUID.randomUUID())
                .conversationId(parent.getConversationId())
                .createdByUserId(userId)
                .salarySgd(salarySgd)
                .offDayPolicy(offDayPolicy)
                .status(OfferStatus.PENDING)
                .parentOfferId(parent.getId())
                .createdAt(now)
                .expiresAt(now.plus(OFFER_TTL))
                .build();
        offers.save(counter);
        chat.send(userId, counter.getConversationId(), "OFFER:" + counter.getId());
        return OfferView.from(counter);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Conversation requireParticipant(UUID userId, UUID conversationId) {
        Conversation c = conversations.findById(conversationId)
                .orElseThrow(() -> new OfferException(OfferError.NOT_FOUND, "Conversation not found"));
        if (!userId.equals(c.getUserAId()) && !userId.equals(c.getUserBId())) {
            throw new OfferException(OfferError.FORBIDDEN, "You are not part of this conversation");
        }
        return c;
    }

    private Offer requireResponder(UUID userId, UUID offerId) {
        Offer offer = offers.findById(offerId)
                .orElseThrow(() -> new OfferException(OfferError.NOT_FOUND, "Offer not found"));
        requireParticipant(userId, offer.getConversationId());
        if (userId.equals(offer.getCreatedByUserId())) {
            throw new OfferException(OfferError.FORBIDDEN, "You cannot respond to your own offer");
        }
        if (offer.getStatus() != OfferStatus.PENDING) {
            throw new OfferException(OfferError.INVALID_STATE, "Offer is no longer pending");
        }
        if (Instant.now().isAfter(offer.getExpiresAt())) {
            offer.setStatus(OfferStatus.EXPIRED);
            throw new OfferException(OfferError.EXPIRED, "Offer has expired");
        }
        return offer;
    }

    private void requireNoActivePlacement(UUID conversationId) {
        offers.findByConversationIdAndStatus(conversationId, OfferStatus.ACCEPTED)
                .forEach(accepted -> placements.findByOfferId(accepted.getId()).ifPresent(p -> {
                    if (!"TERMINATED".equals(p.getStatus())) {
                        throw new OfferException(OfferError.INVALID_STATE,
                                "A placement is already in progress for this conversation");
                    }
                }));
    }

    public enum OfferError { NOT_FOUND, FORBIDDEN, INVALID_STATE, EXPIRED }

    public static class OfferException extends RuntimeException {
        private final OfferError error;
        public OfferException(OfferError error, String message) {
            super(message);
            this.error = error;
        }
        public OfferError error() { return error; }
    }
}
