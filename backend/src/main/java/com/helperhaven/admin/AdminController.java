package com.helperhaven.admin;

import com.helperhaven.admin.dto.*;
import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.auth.UserPrincipal;
import com.helperhaven.domain.enums.UserRole;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * God-mode read/write endpoints for the admin dashboard. All routes return 403
 * immediately unless the caller has the ADMIN role.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    @GetMapping("/stats")
    public AdminStatsView stats(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.getStats();
    }

    @GetMapping("/users")
    public List<AdminUserView> users(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.listUsers();
    }

    @PutMapping("/users/{userId}/status")
    public AdminUserView setUserStatus(
            @PathVariable UUID userId,
            @RequestBody StatusRequest req,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.setUserStatus(userId, req.status());
    }

    @GetMapping("/conversations")
    public List<AdminConversationView> conversations(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.listConversations();
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<AdminMessageView> messages(
            @PathVariable UUID conversationId,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.listMessages(conversationId);
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public AdminMessageView sendMessage(
            @PathVariable UUID conversationId,
            @RequestBody MessageRequest req,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.sendAdminMessage(JwtAuthFilter.currentUserId(), conversationId, req.body());
    }

    @PostMapping("/messages/{messageId}/hide")
    public AdminMessageView toggleHide(
            @PathVariable UUID messageId,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.toggleMessageHidden(messageId);
    }

    @GetMapping("/placements")
    public List<AdminPlacementView> placements(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.listPlacements();
    }

    @PutMapping("/placements/{placementId}/status")
    public AdminPlacementView setPlacementStatus(
            @PathVariable UUID placementId,
            @RequestBody StatusRequest req,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.setPlacementStatus(placementId, req.status());
    }

    @GetMapping("/helpers")
    public List<AdminHelperView> helpers(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.listHelpers();
    }

    @GetMapping("/employers")
    public List<AdminEmployerView> employers(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return admin.listEmployers();
    }

    private static boolean isAdmin() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return p instanceof UserPrincipal up && up.role() == UserRole.ADMIN;
    }

    public record StatusRequest(String status) {}
    public record MessageRequest(String body) {}
}
