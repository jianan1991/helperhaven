package com.helperhaven.placement;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.auth.UserPrincipal;
import com.helperhaven.domain.Placement;
import com.helperhaven.domain.PlacementDocument;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.placement.dto.PlacementDocumentView;
import com.helperhaven.repo.PlacementDocumentRepository;
import com.helperhaven.repo.PlacementRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.storage.FileStorage;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/placements/{placementId}/documents")
public class PlacementDocumentController {

    private static final Set<String> ALLOWED_TYPES = Set.of("NRIC_FRONT", "NRIC_BACK", "NOA");
    private static final Duration VIEW_TTL = Duration.ofHours(1);
    private static final long MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    private final PlacementRepository placements;
    private final PlacementDocumentRepository docs;
    private final UserRepository users;
    private final FileStorage storage;

    public PlacementDocumentController(
            PlacementRepository placements,
            PlacementDocumentRepository docs,
            UserRepository users,
            FileStorage storage
    ) {
        this.placements = placements;
        this.docs = docs;
        this.users = users;
        this.storage = storage;
    }

    @GetMapping
    public List<PlacementDocumentView> list(
            @PathVariable UUID placementId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireAccess(callerId, placementId, res);
        if (p == null) return null;

        return docs.findByPlacementId(placementId).stream()
                .map(d -> toView(d))
                .toList();
    }

    @PostMapping("/{docType}")
    @Transactional
    public PlacementDocumentView upload(
            @PathVariable UUID placementId,
            @PathVariable String docType,
            @RequestParam("file") MultipartFile file,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();

        Placement p = placements.findById(placementId)
                .orElseThrow(() -> new NoSuchElementException("Placement not found"));

        if (!callerId.equals(p.getEmployerId())) {
            res.sendError(403, "Only the employer may upload documents");
            return null;
        }
        if (!"JWC".equals(p.getEngagementMode())) {
            res.sendError(400, "Documents are only required for JWC placements");
            return null;
        }

        String type = docType.toUpperCase();
        if (!ALLOWED_TYPES.contains(type)) {
            res.sendError(400, "Unknown document type: " + docType);
            return null;
        }
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            res.sendError(400, "File must be between 1 byte and 10 MB");
            return null;
        }

        // Delete old version if re-uploading
        docs.findByPlacementIdAndDocType(placementId, type).ifPresent(old -> {
            storage.delete(old.getS3Key());
            docs.delete(old);
        });

        String key = "placements/" + placementId + "/" + type.toLowerCase() + "/"
                + UUID.randomUUID() + "_" + sanitise(file.getOriginalFilename());
        storage.upload(key, file.getInputStream(), file.getSize(),
                file.getContentType() != null ? file.getContentType() : "application/octet-stream");

        PlacementDocument doc = PlacementDocument.builder()
                .id(UUID.randomUUID())
                .placementId(placementId)
                .uploaderId(callerId)
                .docType(type)
                .s3Key(key)
                .originalName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file")
                .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .sizeBytes(file.getSize())
                .uploadedAt(Instant.now())
                .build();
        docs.save(doc);

        return toView(doc);
    }

    @PostMapping("/submit")
    @Transactional
    public Map<String, String> submitDocuments(
            @PathVariable UUID placementId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = placements.findById(placementId).orElse(null);
        if (p == null) { res.sendError(404); return null; }
        if (!callerId.equals(p.getEmployerId())) {
            res.sendError(403, "Only the employer may submit documents");
            return null;
        }
        if (!"JWC".equals(p.getEngagementMode())) {
            res.sendError(400, "Document submission only applies to JWC placements");
            return null;
        }
        if (!"INITIATED".equals(p.getStatus())) {
            // Already submitted — idempotent
            return Map.of("status", p.getStatus());
        }
        Set<String> uploaded = docs.findByPlacementId(placementId).stream()
                .map(PlacementDocument::getDocType)
                .collect(java.util.stream.Collectors.toSet());
        if (!uploaded.containsAll(ALLOWED_TYPES)) {
            res.sendError(400, "All documents must be uploaded before submitting");
            return null;
        }
        p.setStatus("DOCS_COLLECTION");
        p.setUpdatedAt(Instant.now());
        placements.save(p);
        return Map.of("status", "DOCS_COLLECTION");
    }

    // ── helpers ──

    private Placement requireAccess(UUID callerId, UUID placementId, HttpServletResponse res) throws IOException {
        Placement p = placements.findById(placementId).orElse(null);
        if (p == null) { res.sendError(404); return null; }

        boolean isAdmin = isAdmin();
        boolean isParty = callerId.equals(p.getEmployerId()) || callerId.equals(p.getHelperId());
        if (!isAdmin && !isParty) { res.sendError(403); return null; }
        return p;
    }

    private PlacementDocumentView toView(PlacementDocument d) {
        return new PlacementDocumentView(
                d.getId(),
                d.getDocType(),
                d.getOriginalName(),
                d.getMimeType(),
                d.getSizeBytes(),
                d.getUploadedAt(),
                storage.signedGetUrl(d.getS3Key(), VIEW_TTL)
        );
    }

    private static boolean isAdmin() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return p instanceof UserPrincipal up && up.role() == UserRole.ADMIN;
    }

    private static String sanitise(String name) {
        if (name == null) return "file";
        return name.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }
}
