package com.helperhaven.placement.dto;

import java.time.Instant;
import java.util.UUID;

public record PlacementDocumentView(
        UUID id,
        String docType,
        String originalName,
        String mimeType,
        long sizeBytes,
        Instant uploadedAt,
        String uploadedByRole,  // EMPLOYER | HELPER
        String viewUrl          // null when caller is not the uploader (metadata-only)
) {}
