package com.helperhaven.uploads;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.storage.FileStorage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

/**
 * Issues short-lived presigned PUT URLs so the browser can upload directly to
 * S3/MinIO without streaming bytes through our app server. The flow:
 *
 * <ol>
 *   <li>Client POSTs the desired {@code contentType} here and receives
 *       {@code uploadUrl} + {@code key}.</li>
 *   <li>Client PUTs the file bytes to {@code uploadUrl} with the matching
 *       Content-Type header.</li>
 *   <li>Client POSTs the profile with {@code photoUrl} set to the returned
 *       {@code key}. The profile read endpoint mints a fresh signed GET URL on
 *       every read, so we never persist short-lived URLs.</li>
 * </ol>
 *
 * <p>Why presigned PUT instead of a multipart upload through Spring? It scales
 * for free, keeps photo bytes off our heap, and works the same against MinIO
 * locally and S3 in prod.
 */
@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    /** Short whitelist — JPEG covers ~all phone-camera output, PNG/WebP for the rest. */
    private static final Set<String> ALLOWED_PHOTO_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    /** Long enough for a slow phone upload, short enough that a leaked URL is harmless. */
    private static final Duration PUT_TTL = Duration.ofMinutes(10);

    private final FileStorage storage;

    public UploadController(FileStorage storage) {
        this.storage = storage;
    }

    @PostMapping("/profile-photo")
    public PresignedUpload profilePhoto(@Valid @RequestBody PresignRequest req) {
        if (!ALLOWED_PHOTO_TYPES.contains(req.contentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported content type: " + req.contentType());
        }
        UUID userId = JwtAuthFilter.currentUserId();
        String ext = extensionFor(req.contentType());
        String key = "profile-photos/" + userId + "/" + UUID.randomUUID() + "." + ext;
        String uploadUrl = storage.signedPutUrl(key, req.contentType(), PUT_TTL);
        return new PresignedUpload(uploadUrl, key, PUT_TTL.toSeconds());
    }

    private static String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "bin";
        };
    }

    public record PresignRequest(@NotBlank String contentType) {}

    public record PresignedUpload(String uploadUrl, String key, long expiresInSeconds) {}
}
