package com.helperhaven.placement;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.auth.UserPrincipal;
import com.helperhaven.domain.Placement;
import com.helperhaven.domain.PlacementDocument;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.notification.NotificationService;
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

    private static final Set<String> EMPLOYER_TYPES = Set.of("NRIC_FRONT", "NRIC_BACK", "NOA");
    private static final Set<String> HELPER_TYPES  = Set.of("PASSPORT");
    private static final Duration VIEW_TTL = Duration.ofHours(1);
    private static final long MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    private final PlacementRepository placements;
    private final PlacementDocumentRepository docs;
    private final UserRepository users;
    private final FileStorage storage;
    private final NotificationService notifService;

    public PlacementDocumentController(
            PlacementRepository placements,
            PlacementDocumentRepository docs,
            UserRepository users,
            FileStorage storage,
            NotificationService notifService
    ) {
        this.placements = placements;
        this.docs = docs;
        this.users = users;
        this.storage = storage;
        this.notifService = notifService;
    }

    @GetMapping
    public List<PlacementDocumentView> list(
            @PathVariable UUID placementId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireAccess(callerId, placementId, res);
        if (p == null) return null;

        boolean admin = isAdmin();
        return docs.findByPlacementId(placementId).stream()
                .map(d -> toView(d, p, callerId, admin))
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

        // Determine which doc types this caller may upload
        Set<String> callerAllowed;
        if (callerId.equals(p.getEmployerId())) {
            if (!"JWC".equals(p.getEngagementMode())) {
                res.sendError(400, "Documents are only required for JWC placements");
                return null;
            }
            callerAllowed = EMPLOYER_TYPES;
        } else if (callerId.equals(p.getHelperId())) {
            callerAllowed = HELPER_TYPES;
        } else {
            res.sendError(403, "Only a party to this placement may upload documents");
            return null;
        }

        String type = docType.toUpperCase();
        if (!callerAllowed.contains(type)) {
            res.sendError(400, "Document type " + docType + " is not allowed for your role");
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

        return toView(doc, p, callerId, false);
    }

    @PostMapping("/submit")
    @Transactional
    public Map<String, Object> submitDocuments(
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
            // Already past INITIATED — idempotent
            return Map.of("status", p.getStatus(),
                    "employerDocsSubmittedAt", p.getEmployerDocsSubmittedAt() != null
                            ? p.getEmployerDocsSubmittedAt().toString() : "");
        }
        if (p.getEmployerDocsSubmittedAt() != null) {
            // Already submitted — idempotent
            return Map.of("status", p.getStatus(),
                    "employerDocsSubmittedAt", p.getEmployerDocsSubmittedAt().toString());
        }
        Set<String> uploaded = docs.findByPlacementId(placementId).stream()
                .map(PlacementDocument::getDocType)
                .collect(java.util.stream.Collectors.toSet());
        if (!uploaded.containsAll(EMPLOYER_TYPES)) {
            res.sendError(400, "All required documents must be uploaded before submitting");
            return null;
        }
        Instant now = Instant.now();
        p.setEmployerDocsSubmittedAt(now);
        // Transition to DOCS_COLLECTION only once both parties have submitted
        if (p.getHelperDocsSubmittedAt() != null) {
            p.setStatus("DOCS_COLLECTION");
            notifService.notifyAdminsDocsReady(p.getId());
        }
        p.setUpdatedAt(now);
        placements.save(p);
        return Map.of("status", p.getStatus(), "employerDocsSubmittedAt", now.toString());
    }

    @PostMapping("/helper-submit")
    @Transactional
    public Map<String, Object> helperSubmitDocuments(
            @PathVariable UUID placementId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = placements.findById(placementId).orElse(null);
        if (p == null) { res.sendError(404); return null; }
        if (!callerId.equals(p.getHelperId())) {
            res.sendError(403, "Only the helper may submit their documents");
            return null;
        }
        if (!"INITIATED".equals(p.getStatus())) {
            // Already past INITIATED — idempotent
            return Map.of("status", p.getStatus(),
                    "helperDocsSubmittedAt", p.getHelperDocsSubmittedAt() != null
                            ? p.getHelperDocsSubmittedAt().toString() : "");
        }
        if (p.getHelperDocsSubmittedAt() != null) {
            // Already submitted — idempotent
            return Map.of("status", p.getStatus(),
                    "helperDocsSubmittedAt", p.getHelperDocsSubmittedAt().toString());
        }
        boolean hasPassport = docs.findByPlacementId(placementId).stream()
                .anyMatch(d -> "PASSPORT".equals(d.getDocType()));
        if (!hasPassport) {
            res.sendError(400, "Passport must be uploaded before submitting");
            return null;
        }
        Instant now = Instant.now();
        p.setHelperDocsSubmittedAt(now);
        // Transition to DOCS_COLLECTION only once both parties have submitted (JWC only)
        if ("JWC".equals(p.getEngagementMode()) && p.getEmployerDocsSubmittedAt() != null) {
            p.setStatus("DOCS_COLLECTION");
            notifService.notifyAdminsDocsReady(p.getId());
        }
        p.setUpdatedAt(now);
        placements.save(p);
        return Map.of("status", p.getStatus(), "helperDocsSubmittedAt", now.toString());
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

    private PlacementDocumentView toView(PlacementDocument d, Placement placement, UUID callerId, boolean isAdmin) {
        String uploadedByRole = d.getUploaderId().equals(placement.getEmployerId()) ? "EMPLOYER" : "HELPER";
        String url = (isAdmin || callerId.equals(d.getUploaderId()))
                ? storage.signedGetUrl(d.getS3Key(), VIEW_TTL)
                : null;
        return new PlacementDocumentView(
                d.getId(),
                d.getDocType(),
                d.getOriginalName(),
                d.getMimeType(),
                d.getSizeBytes(),
                d.getUploadedAt(),
                uploadedByRole,
                url
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
