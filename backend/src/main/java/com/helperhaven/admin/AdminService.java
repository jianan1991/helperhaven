package com.helperhaven.admin;

import com.helperhaven.admin.dto.*;
import com.helperhaven.domain.*;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import com.helperhaven.placement.dto.SelectedServiceView;
import com.helperhaven.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class AdminService {

    private static final int PREVIEW_LEN = 100;

    private static final List<String> PLACEMENT_STATUS_ORDER = List.of(
            "INITIATED", "DOCS_COLLECTION", "MOM_SUBMITTED", "IPA_ISSUED", "HELPER_ARRIVAL", "ACTIVE"
    );

    private final UserRepository users;
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final PlacementRepository placements;
    private final PlacementServiceItemRepository placementServiceItems;
    private final ServiceItemRepository serviceItems;
    private final HelperProfileRepository helpers;
    private final EmployerProfileRepository employers;
    private final TerminationRequestRepository terminationRequests;
    private final com.helperhaven.notification.NotificationService notifService;

    public AdminService(
            UserRepository users,
            ConversationRepository conversations,
            MessageRepository messages,
            PlacementRepository placements,
            PlacementServiceItemRepository placementServiceItems,
            ServiceItemRepository serviceItems,
            HelperProfileRepository helpers,
            EmployerProfileRepository employers,
            TerminationRequestRepository terminationRequests,
            com.helperhaven.notification.NotificationService notifService
    ) {
        this.users = users;
        this.conversations = conversations;
        this.messages = messages;
        this.placements = placements;
        this.placementServiceItems = placementServiceItems;
        this.serviceItems = serviceItems;
        this.helpers = helpers;
        this.employers = employers;
        this.terminationRequests = terminationRequests;
        this.notifService = notifService;
    }

    public AdminStatsView getStats() {
        List<User> allUsers = users.findAll();
        long employerCount = allUsers.stream().filter(u -> u.getRole() == UserRole.EMPLOYER).count();
        long helperCount = allUsers.stream().filter(u -> u.getRole() == UserRole.HELPER).count();
        return new AdminStatsView(
                allUsers.size(),
                employerCount,
                helperCount,
                conversations.count(),
                placements.count(),
                helpers.count(),
                employers.count()
        );
    }

    public List<AdminUserView> listUsers() {
        return users.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(u -> new AdminUserView(
                        u.getId(),
                        u.getEmail(),
                        u.getPhoneE164(),
                        u.getRole().name(),
                        u.getStatus().name(),
                        u.getCreatedAt(),
                        u.getLastLoginAt(),
                        u.getEmailVerifiedAt() != null
                ))
                .toList();
    }

    @Transactional
    public AdminUserView setUserStatus(UUID userId, String statusStr) {
        UserStatus newStatus;
        try {
            newStatus = UserStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown status: " + statusStr);
        }
        User u = users.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
        u.setStatus(newStatus);
        users.save(u);
        return new AdminUserView(
                u.getId(), u.getEmail(), u.getPhoneE164(),
                u.getRole().name(), u.getStatus().name(),
                u.getCreatedAt(), u.getLastLoginAt(),
                u.getEmailVerifiedAt() != null
        );
    }

    public List<AdminConversationView> listConversations() {
        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();

        return conversations.findAll().stream()
                .sorted(Comparator.comparing(
                        c -> c.getLastMessageAt() != null ? c.getLastMessageAt() : c.getCreatedAt(),
                        Comparator.reverseOrder()))
                .map(c -> {
                    User a = userMap.get(c.getUserAId());
                    User b = userMap.get(c.getUserBId());
                    List<Message> msgs = messages.findByConversationIdOrderBySentAtAsc(c.getId());
                    String preview = msgs.isEmpty() ? null :
                            truncate(msgs.getLast().getBody(), PREVIEW_LEN);
                    return new AdminConversationView(
                            c.getId(),
                            c.getUserAId(),
                            a != null ? a.getEmail() : "?",
                            displayNames.getOrDefault(c.getUserAId(), a != null ? a.getEmail() : "?"),
                            a != null ? a.getRole().name() : "?",
                            c.getUserBId(),
                            b != null ? b.getEmail() : "?",
                            displayNames.getOrDefault(c.getUserBId(), b != null ? b.getEmail() : "?"),
                            b != null ? b.getRole().name() : "?",
                            c.getStatus().name(),
                            msgs.size(),
                            c.getLastMessageAt(),
                            preview,
                            c.getCreatedAt()
                    );
                })
                .toList();
    }

    public List<AdminMessageView> listMessages(UUID conversationId) {
        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();
        return messages.findByConversationIdOrderBySentAtAsc(conversationId).stream()
                .map(m -> {
                    User sender = userMap.get(m.getSenderUserId());
                    return new AdminMessageView(
                            m.getId(),
                            m.getSenderUserId(),
                            sender != null ? sender.getEmail() : "?",
                            displayNames.getOrDefault(m.getSenderUserId(),
                                    sender != null ? sender.getEmail() : "?"),
                            m.getBody(),
                            m.isFlagged(),
                            m.getSentAt()
                    );
                })
                .toList();
    }

    @Transactional
    public AdminMessageView toggleMessageHidden(UUID messageId) {
        Message m = messages.findById(messageId)
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + messageId));
        m.setFlagged(!m.isFlagged());
        messages.save(m);
        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();
        User sender = userMap.get(m.getSenderUserId());
        return new AdminMessageView(
                m.getId(), m.getSenderUserId(),
                sender != null ? sender.getEmail() : "?",
                displayNames.getOrDefault(m.getSenderUserId(), sender != null ? sender.getEmail() : "?"),
                m.getBody(), m.isFlagged(), m.getSentAt()
        );
    }

    @Transactional
    public AdminMessageView sendAdminMessage(UUID adminId, UUID conversationId, String body) {
        Conversation c = conversations.findById(conversationId)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found: " + conversationId));
        String trimmed = body == null ? "" : body.strip();
        if (trimmed.isEmpty()) throw new IllegalArgumentException("Message body cannot be empty");

        Instant now = Instant.now();
        Message m = Message.builder()
                .id(UUID.randomUUID())
                .conversationId(conversationId)
                .senderUserId(adminId)
                .body(trimmed)
                .hasRedactions(false)
                .flagged(false)
                .sentAt(now)
                .build();
        messages.save(m);

        c.setLastMessageAt(now);
        conversations.save(c);

        User sender = users.findById(adminId).orElse(null);
        return new AdminMessageView(
                m.getId(), adminId,
                sender != null ? sender.getEmail() : "admin",
                "HelperHaven Admin",
                trimmed, false, now
        );
    }

    public List<AdminPlacementView> listPlacements() {
        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();
        Map<UUID, ServiceItem> serviceMap = new HashMap<>();
        serviceItems.findAll().forEach(s -> serviceMap.put(s.getId(), s));

        return placements.findAll().stream()
                .sorted(Comparator.comparing(Placement::getCreatedAt).reversed())
                .map(p -> {
                    User employer = userMap.get(p.getEmployerId());
                    User helper = userMap.get(p.getHelperId());
                    List<SelectedServiceView> svcs = placementServiceItems
                            .findByIdPlacementId(p.getId()).stream()
                            .map(psi -> {
                                ServiceItem svc = serviceMap.get(psi.getId().getServiceId());
                                return svc != null
                                        ? new SelectedServiceView(svc.getId(), svc.getIcon(), svc.getTitle(), psi.getPriceSgd(), svc.getWorkflowStage())
                                        : null;
                            })
                            .filter(Objects::nonNull)
                            .toList();
                    return new AdminPlacementView(
                            p.getId(),
                            p.getEmployerId(),
                            employer != null ? employer.getEmail() : "?",
                            displayNames.getOrDefault(p.getEmployerId(), employer != null ? employer.getEmail() : "?"),
                            p.getHelperId(),
                            helper != null ? helper.getEmail() : "?",
                            displayNames.getOrDefault(p.getHelperId(), helper != null ? helper.getEmail() : "?"),
                            p.getEngagementMode(),
                            p.getStatus(),
                            p.getEmployerDocsSubmittedAt(),
                            p.getHelperDocsSubmittedAt(),
                            p.getCreatedAt(),
                            p.getUpdatedAt(),
                            svcs
                    );
                })
                .toList();
    }

    @Transactional
    public AdminPlacementView setPlacementStatus(UUID placementId, String newStatus) {
        if (!PLACEMENT_STATUS_ORDER.contains(newStatus)) {
            throw new IllegalArgumentException("Unknown placement status: " + newStatus);
        }
        Placement p = placements.findById(placementId)
                .orElseThrow(() -> new NoSuchElementException("Placement not found: " + placementId));

        // Enforce sequential transitions — skipping steps is not allowed
        int currentIdx = PLACEMENT_STATUS_ORDER.indexOf(p.getStatus());
        int newIdx = PLACEMENT_STATUS_ORDER.indexOf(newStatus);
        if (newIdx != currentIdx + 1) {
            throw new IllegalArgumentException(
                    "Invalid transition from " + p.getStatus() + " to " + newStatus
                    + ". Steps must advance one at a time.");
        }

        Instant now = Instant.now();
        p.setStatus(newStatus);
        p.setUpdatedAt(now);

        // Record per-stage timestamp
        switch (newStatus) {
            case "DOCS_COLLECTION" -> p.setDocsAt(now);
            case "MOM_SUBMITTED"   -> p.setMomSubmittedAt(now);
            case "IPA_ISSUED"      -> p.setIpaIssuedAt(now);
            case "HELPER_ARRIVAL"  -> p.setArrivalAt(now);
            case "ACTIVE"          -> p.setActivatedAt(now);
        }

        boolean becomingActive = "ACTIVE".equals(newStatus);
        if (becomingActive && p.getEmploymentStartDate() == null) {
            p.setEmploymentStartDate(LocalDate.now());
            if (p.getEmploymentEndDate() == null) {
                p.setEmploymentEndDate(LocalDate.now().plusYears(2));
            }
        }
        placements.save(p);
        if (becomingActive) {
            notifService.notifyPartiesPlacementActive(p.getId());
        }

        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();
        Map<UUID, ServiceItem> serviceMap = new HashMap<>();
        serviceItems.findAll().forEach(s -> serviceMap.put(s.getId(), s));

        User employer = userMap.get(p.getEmployerId());
        User helper = userMap.get(p.getHelperId());
        List<SelectedServiceView> svcs = placementServiceItems
                .findByIdPlacementId(p.getId()).stream()
                .map(psi -> {
                    ServiceItem svc = serviceMap.get(psi.getId().getServiceId());
                    return svc != null
                            ? new SelectedServiceView(svc.getId(), svc.getIcon(), svc.getTitle(), psi.getPriceSgd(), svc.getWorkflowStage())
                            : null;
                })
                .filter(Objects::nonNull)
                .toList();

        return new AdminPlacementView(
                p.getId(),
                p.getEmployerId(),
                employer != null ? employer.getEmail() : "?",
                displayNames.getOrDefault(p.getEmployerId(), employer != null ? employer.getEmail() : "?"),
                p.getHelperId(),
                helper != null ? helper.getEmail() : "?",
                displayNames.getOrDefault(p.getHelperId(), helper != null ? helper.getEmail() : "?"),
                p.getEngagementMode(),
                p.getStatus(),
                p.getEmployerDocsSubmittedAt(),
                p.getHelperDocsSubmittedAt(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                svcs
        );
    }

    public List<AdminHelperView> listHelpers() {
        Map<UUID, User> userMap = buildUserMap();
        return helpers.findAll().stream()
                .sorted(Comparator.comparing(HelperProfile::getCreatedAt).reversed())
                .map(h -> {
                    User u = userMap.get(h.getUserId());
                    return new AdminHelperView(
                            h.getUserId(),
                            u != null ? u.getEmail() : "?",
                            h.getDisplayFirstName(),
                            h.getFullName(),
                            h.getNationality() != null ? h.getNationality().name() : null,
                            h.getYearsExperience() != null ? h.getYearsExperience().intValue() : null,
                            h.getExpectedSalarySgd(),
                            h.getCurrentLocation(),
                            h.getAvailableFrom(),
                            Boolean.TRUE.equals(h.getWillingLiveIn()),
                            Boolean.TRUE.equals(h.getAvailableForTransfer()),
                            u != null ? u.getStatus().name() : "?",
                            h.getPhotoUrl()
                    );
                })
                .toList();
    }

    public List<AdminEmployerView> listEmployers() {
        Map<UUID, User> userMap = buildUserMap();
        return employers.findAll().stream()
                .sorted(Comparator.comparing(EmployerProfile::getCreatedAt).reversed())
                .map(e -> {
                    User u = userMap.get(e.getUserId());
                    return new AdminEmployerView(
                            e.getUserId(),
                            u != null ? u.getEmail() : "?",
                            e.getFullName(),
                            e.getHousing() != null ? e.getHousing().name() : null,
                            e.getDistrict(),
                            e.getHouseholdSize() != null ? e.getHouseholdSize().intValue() : null,
                            e.getNumChildren() != null ? e.getNumChildren().intValue() : null,
                            e.getNumElderly() != null ? e.getNumElderly().intValue() : null,
                            e.getHasPets(),
                            e.getSalaryOfferSgdMin(),
                            e.getSalaryOfferSgdMax(),
                            e.getHiringPurpose(),
                            u != null ? u.getStatus().name() : "?"
                    );
                })
                .toList();
    }

    public List<AdminTerminationView> listTerminationRequests() {
        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();
        return terminationRequests.findAllByOrderByCreatedAtDesc().stream()
                .map(tr -> {
                    Placement p = placements.findById(tr.getPlacementId()).orElse(null);
                    String employerName = p != null ? displayNames.getOrDefault(p.getEmployerId(),
                            userMap.getOrDefault(p.getEmployerId(), null) != null
                                    ? userMap.get(p.getEmployerId()).getEmail() : "?") : "?";
                    String helperName = p != null ? displayNames.getOrDefault(p.getHelperId(),
                            userMap.getOrDefault(p.getHelperId(), null) != null
                                    ? userMap.get(p.getHelperId()).getEmail() : "?") : "?";
                    return new AdminTerminationView(
                            tr.getId(), tr.getPlacementId(),
                            p != null ? p.getEngagementMode() : "?",
                            employerName, helperName,
                            tr.getReason(), tr.getStatus(),
                            tr.getAdminNotes(), tr.getCreatedAt(), tr.getResolvedAt()
                    );
                })
                .toList();
    }

    @Transactional
    public AdminTerminationView resolveTermination(UUID terminationId, String adminNotes, boolean resolved) {
        TerminationRequest tr = terminationRequests.findById(terminationId)
                .orElseThrow(() -> new NoSuchElementException("Termination request not found: " + terminationId));
        Map<UUID, User> userMap = buildUserMap();
        Map<UUID, String> displayNames = buildDisplayNames();
        Placement p = placements.findById(tr.getPlacementId()).orElse(null);

        if (resolved) {
            tr.setStatus("RESOLVED");
            tr.setResolvedAt(Instant.now());
            if (p != null) {
                p.setStatus("TERMINATED");
                p.setUpdatedAt(Instant.now());
                placements.save(p);
            }
        }
        if (adminNotes != null) tr.setAdminNotes(adminNotes);
        terminationRequests.save(tr);

        String employerName = p != null ? displayNames.getOrDefault(p.getEmployerId(), "?") : "?";
        String helperName = p != null ? displayNames.getOrDefault(p.getHelperId(), "?") : "?";
        return new AdminTerminationView(
                tr.getId(), tr.getPlacementId(),
                p != null ? p.getEngagementMode() : "?",
                employerName, helperName,
                tr.getReason(), tr.getStatus(),
                tr.getAdminNotes(), tr.getCreatedAt(), tr.getResolvedAt()
        );
    }

    // ── private helpers ──

    private Map<UUID, User> buildUserMap() {
        Map<UUID, User> map = new HashMap<>();
        users.findAll().forEach(u -> map.put(u.getId(), u));
        return map;
    }

    private Map<UUID, String> buildDisplayNames() {
        Map<UUID, String> names = new HashMap<>();
        helpers.findAll().forEach(h -> {
            String name = h.getDisplayFirstName() != null ? h.getDisplayFirstName() : h.getFullName();
            if (name != null) names.put(h.getUserId(), name);
        });
        employers.findAll().forEach(e -> {
            if (e.getFullName() != null) names.put(e.getUserId(), e.getFullName());
        });
        users.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .forEach(u -> names.put(u.getId(), "HelperHaven Admin"));
        return names;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
