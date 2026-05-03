package com.helperhaven.placement;

import com.helperhaven.domain.Conversation;
import com.helperhaven.domain.Offer;
import com.helperhaven.domain.Placement;
import com.helperhaven.domain.PlacementServiceItem;
import com.helperhaven.domain.PlacementServiceItemKey;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.placement.dto.CreatePlacementRequest;
import com.helperhaven.placement.dto.PlacementView;
import com.helperhaven.placement.dto.SelectedServiceView;
import com.helperhaven.repo.ConversationRepository;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.OfferRepository;
import com.helperhaven.repo.PlacementRepository;
import com.helperhaven.repo.PlacementServiceItemRepository;
import com.helperhaven.repo.ServiceItemRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class PlacementService {

    private static final Duration PHOTO_TTL = Duration.ofHours(1);

    private final PlacementRepository placements;
    private final PlacementServiceItemRepository placementServiceItems;
    private final ServiceItemRepository serviceItems;
    private final OfferRepository offers;
    private final ConversationRepository conversations;
    private final UserRepository users;
    private final HelperProfileRepository helpers;
    private final EmployerProfileRepository employers;
    private final FileStorage storage;

    public PlacementService(
            PlacementRepository placements,
            PlacementServiceItemRepository placementServiceItems,
            ServiceItemRepository serviceItems,
            OfferRepository offers,
            ConversationRepository conversations,
            UserRepository users,
            HelperProfileRepository helpers,
            EmployerProfileRepository employers,
            FileStorage storage
    ) {
        this.placements = placements;
        this.placementServiceItems = placementServiceItems;
        this.serviceItems = serviceItems;
        this.offers = offers;
        this.conversations = conversations;
        this.users = users;
        this.helpers = helpers;
        this.employers = employers;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public List<PlacementView> listForUser(UUID userId) {
        User u = users.findById(userId)
                .orElseThrow(() -> new PlacementException(PlacementError.NOT_FOUND, "Account not found"));
        List<Placement> rows = u.getRole() == UserRole.EMPLOYER
                ? placements.findByEmployerIdOrderByCreatedAtDesc(userId)
                : placements.findByHelperIdOrderByCreatedAtDesc(userId);
        return rows.stream().map(this::toView).toList();
    }

    @Transactional
    public PlacementView create(UUID userId, UUID offerId, CreatePlacementRequest req) {
        User caller = users.findById(userId)
                .orElseThrow(() -> new PlacementException(PlacementError.NOT_FOUND, "Account not found"));
        if (caller.getRole() != UserRole.EMPLOYER) {
            throw new PlacementException(PlacementError.FORBIDDEN, "Only employers can initiate a placement");
        }
        String engagementMode = req.mode();
        if (!"JWC".equals(engagementMode) && !"DIY".equals(engagementMode)) {
            throw new PlacementException(PlacementError.INVALID_STATE, "Engagement mode must be JWC or DIY");
        }

        Offer offer = offers.findById(offerId)
                .orElseThrow(() -> new PlacementException(PlacementError.NOT_FOUND, "Offer not found"));
        if (!"ACCEPTED".equals(offer.getStatus())) {
            throw new PlacementException(PlacementError.INVALID_STATE, "Offer must be accepted first");
        }

        // If a placement already exists for this offer, allow changing the mode while
        // still INITIATED (family hasn't committed docs yet). Once the workflow has
        // progressed past INITIATED the mode is locked.
        var existing = placements.findByOfferId(offerId);
        if (existing.isPresent()) {
            Placement p = existing.get();
            if (!"INITIATED".equals(p.getStatus()) || engagementMode.equals(p.getEngagementMode())) {
                return toView(p);
            }
            p.setEngagementMode(engagementMode);
            p.setUpdatedAt(Instant.now());
            placements.save(p);
            placementServiceItems.deleteAll(placementServiceItems.findByIdPlacementId(p.getId()));
            List<UUID> newServiceIds = req.selectedServiceIds() != null ? req.selectedServiceIds() : Collections.emptyList();
            for (UUID serviceId : newServiceIds) {
                serviceItems.findById(serviceId).ifPresent(svc ->
                    placementServiceItems.save(PlacementServiceItem.builder()
                            .id(new PlacementServiceItemKey(p.getId(), serviceId))
                            .priceSgd(svc.getPriceSgd())
                            .build()));
            }
            return toView(p);
        }

        // Derive helper: the conversation participant who is not the employer
        Conversation conv = conversations.findById(offer.getConversationId())
                .orElseThrow(() -> new PlacementException(PlacementError.NOT_FOUND, "Conversation not found"));
        if (!userId.equals(conv.getUserAId()) && !userId.equals(conv.getUserBId())) {
            throw new PlacementException(PlacementError.FORBIDDEN, "You are not part of this conversation");
        }
        UUID helperId = userId.equals(conv.getUserAId()) ? conv.getUserBId() : conv.getUserAId();

        Instant now = Instant.now();
        Placement p = Placement.builder()
                .id(UUID.randomUUID())
                .offerId(offerId)
                .employerId(userId)
                .helperId(helperId)
                .engagementMode(engagementMode)
                .status("INITIATED")
                .createdAt(now)
                .updatedAt(now)
                .build();
        placements.save(p);

        // Snapshot service prices at purchase time
        List<UUID> serviceIds = req.selectedServiceIds() != null ? req.selectedServiceIds() : Collections.emptyList();
        for (UUID serviceId : serviceIds) {
            serviceItems.findById(serviceId).ifPresent(svc -> {
                placementServiceItems.save(PlacementServiceItem.builder()
                        .id(new PlacementServiceItemKey(p.getId(), serviceId))
                        .priceSgd(svc.getPriceSgd())
                        .build());
            });
        }

        return toView(p);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private PlacementView toView(Placement p) {
        var helperProfile = helpers.findById(p.getHelperId()).orElse(null);
        var employerProfile = employers.findById(p.getEmployerId()).orElse(null);
        String helperName = helperProfile != null ? helperProfile.getDisplayFirstName() : "Helper";
        String helperPhoto = helperProfile != null ? signedPhoto(helperProfile.getPhotoUrl()) : null;
        String employerName = (employerProfile != null && employerProfile.getFullName() != null)
                ? employerProfile.getFullName()
                : (employerProfile != null && employerProfile.getDistrict() != null
                   ? "Family in " + employerProfile.getDistrict()
                   : "Family");

        List<SelectedServiceView> selected = placementServiceItems
                .findByIdPlacementId(p.getId())
                .stream()
                .map(psi -> {
                    var svc = serviceItems.findById(psi.getId().getServiceId()).orElse(null);
                    return new SelectedServiceView(
                            psi.getId().getServiceId(),
                            svc != null ? svc.getIcon() : "",
                            svc != null ? svc.getTitle() : "Service",
                            psi.getPriceSgd()
                    );
                })
                .toList();

        return new PlacementView(
                p.getId(), p.getOfferId(), p.getEmployerId(), p.getHelperId(),
                p.getEngagementMode(), p.getStatus(),
                helperName, helperPhoto, employerName,
                p.getCreatedAt(), p.getUpdatedAt(),
                selected
        );
    }

    private String signedPhoto(String key) {
        if (key == null || key.isBlank()) return null;
        if (key.startsWith("http://") || key.startsWith("https://")) return key;
        return storage.signedGetUrl(key, PHOTO_TTL);
    }

    public enum PlacementError { NOT_FOUND, FORBIDDEN, INVALID_STATE }

    public static class PlacementException extends RuntimeException {
        private final PlacementError error;
        public PlacementException(PlacementError error, String message) {
            super(message);
            this.error = error;
        }
        public PlacementError error() { return error; }
    }
}
