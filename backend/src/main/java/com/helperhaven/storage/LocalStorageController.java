package com.helperhaven.storage;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * Accepts PUT uploads and serves GET requests for local-dev file storage.
 * Only registered when provider=local (the default for local development).
 * Mimics the presigned-URL flow used with S3/MinIO in production.
 */
@RestController
@RequestMapping("/api/local-storage")
@ConditionalOnProperty(name = "helperhaven.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageController {

    @PutMapping("/**")
    public ResponseEntity<Void> put(
            @RequestHeader(value = HttpHeaders.CONTENT_TYPE, defaultValue = "application/octet-stream") String contentType,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        String key = extractKey(request.getRequestURI());
        Path target = LocalDiskFileStorage.resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(request.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/**")
    public ResponseEntity<byte[]> get(jakarta.servlet.http.HttpServletRequest request) {
        String key = extractKey(request.getRequestURI());
        Path file = LocalDiskFileStorage.resolve(key);
        if (!Files.exists(file)) {
            return ResponseEntity.notFound().build();
        }
        try {
            String mimeType = Files.probeContentType(file);
            MediaType mediaType = mimeType != null ? MediaType.parseMediaType(mimeType) : MediaType.APPLICATION_OCTET_STREAM;
            return ResponseEntity.ok().contentType(mediaType).body(Files.readAllBytes(file));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String extractKey(String uri) {
        String prefix = "/api/local-storage/";
        int idx = uri.indexOf(prefix);
        return idx >= 0 ? uri.substring(idx + prefix.length()) : uri;
    }
}
