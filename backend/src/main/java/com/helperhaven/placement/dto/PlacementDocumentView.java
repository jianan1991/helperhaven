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
        String viewUrl
) {}
