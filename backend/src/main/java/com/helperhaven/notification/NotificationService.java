package com.helperhaven.notification;

import com.helperhaven.domain.Notification;
import com.helperhaven.domain.Placement;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.NotificationRepository;
import com.helperhaven.repo.PlacementRepository;
import com.helperhaven.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final PlacementRepository placements;

    public NotificationService(
            NotificationRepository notifications,
            UserRepository users,
            PlacementRepository placements
    ) {
        this.notifications = notifications;
        this.users = users;
        this.placements = placements;
    }

    @Transactional
    public void notifyAdminsDocsReady(UUID placementId) {
        Instant now = Instant.now();
        users.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .forEach(admin -> notifications.save(
                        Notification.builder()
                                .id(UUID.randomUUID())
                                .recipientUserId(admin.getId())
                                .type("DOCS_REVIEW_REQUIRED")
                                .title("Documents ready for review")
                                .body("Both the employer and helper have submitted their documents. Please review and advance the placement.")
                                .relatedPlacementId(placementId)
                                .createdAt(now)
                                .build()
                ));
    }

    @Transactional
    public void notifyPartiesPlacementActive(UUID placementId) {
        Placement p = placements.findById(placementId).orElse(null);
        if (p == null) return;
        Instant now = Instant.now();
        String body = "Your placement is now active. Head to Active Employment to manage schedules, leave, and tasks.";
        notifications.save(Notification.builder()
                .id(UUID.randomUUID())
                .recipientUserId(p.getEmployerId())
                .type("PLACEMENT_ACTIVE")
                .title("Your placement is now active!")
                .body(body)
                .relatedPlacementId(placementId)
                .createdAt(now)
                .build());
        notifications.save(Notification.builder()
                .id(UUID.randomUUID())
                .recipientUserId(p.getHelperId())
                .type("PLACEMENT_ACTIVE")
                .title("Your placement is now active!")
                .body(body)
                .relatedPlacementId(placementId)
                .createdAt(now)
                .build());
    }

    @Transactional(readOnly = true)
    public List<NotificationView> listForUser(UUID userId) {
        return notifications.findByRecipientUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notifications.countByRecipientUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public NotificationView markRead(UUID notificationId, UUID callerId) {
        Notification n = notifications.findById(notificationId)
                .orElseThrow(() -> new NoSuchElementException("Notification not found"));
        if (!n.getRecipientUserId().equals(callerId)) {
            throw new SecurityException("Not your notification");
        }
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            notifications.save(n);
        }
        return NotificationView.from(n);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notifications.findByRecipientUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(n -> n.getReadAt() == null)
                .forEach(n -> {
                    n.setReadAt(Instant.now());
                    notifications.save(n);
                });
    }

    public record NotificationView(
            UUID id,
            String type,
            String title,
            String body,
            UUID relatedPlacementId,
            String readAt,
            String createdAt
    ) {
        static NotificationView from(Notification n) {
            return new NotificationView(
                    n.getId(),
                    n.getType(),
                    n.getTitle(),
                    n.getBody(),
                    n.getRelatedPlacementId(),
                    n.getReadAt() != null ? n.getReadAt().toString() : null,
                    n.getCreatedAt().toString()
            );
        }
    }
}
