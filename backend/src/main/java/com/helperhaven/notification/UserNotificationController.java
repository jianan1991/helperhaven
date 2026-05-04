package com.helperhaven.notification;

import com.helperhaven.auth.JwtAuthFilter;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class UserNotificationController {

    private final NotificationService notifService;

    public UserNotificationController(NotificationService notifService) {
        this.notifService = notifService;
    }

    @GetMapping
    public List<NotificationService.NotificationView> list() {
        return notifService.listForUser(JwtAuthFilter.currentUserId());
    }

    @PostMapping("/{id}/read")
    public NotificationService.NotificationView markRead(@PathVariable UUID id) {
        return notifService.markRead(id, JwtAuthFilter.currentUserId());
    }

    @PostMapping("/read-all")
    public void markAllRead() {
        notifService.markAllRead(JwtAuthFilter.currentUserId());
    }
}
