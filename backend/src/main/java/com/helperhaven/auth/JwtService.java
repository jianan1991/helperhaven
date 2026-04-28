package com.helperhaven.auth;

import com.helperhaven.config.AppProperties;
import com.helperhaven.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies HS256 JWTs for both access and refresh tokens.
 *
 * <p>Two token kinds:
 * <ul>
 *   <li><b>access</b> — short-lived (15m), carries role + status as claims so the auth filter
 *       can build a SecurityContext without hitting the database every request.</li>
 *   <li><b>refresh</b> — long-lived (30d), opaque to the API beyond verifying the signature
 *       and {@code typ=refresh}. Refresh tokens are never accepted on protected endpoints.</li>
 * </ul>
 *
 * <p>The signing key is derived from {@code helperhaven.auth.jwt.secret}; we require ≥32 bytes
 * to satisfy HS256's minimum key-length guidance.
 */
@Service
public class JwtService {

    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_STATUS = "status";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final SecretKey signingKey;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(AppProperties props) {
        AppProperties.Jwt jwt = props.auth().jwt();
        byte[] keyBytes = jwt.secret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "helperhaven.auth.jwt.secret must be at least 32 bytes for HS256");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTtl = jwt.accessTokenTtl();
        this.refreshTtl = jwt.refreshTokenTtl();
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(CLAIM_STATUS, user.getStatus().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(signingKey)
                .compact();
    }

    public String issueRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTtl)))
                .signWith(signingKey)
                .compact();
    }

    public ParsedToken parseAccessToken(String token) {
        return parseAndRequireType(token, TYPE_ACCESS);
    }

    public ParsedToken parseRefreshToken(String token) {
        return parseAndRequireType(token, TYPE_REFRESH);
    }

    private ParsedToken parseAndRequireType(String token, String expectedType) {
        try {
            Claims c = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String type = c.get(CLAIM_TYPE, String.class);
            if (!expectedType.equals(type)) {
                throw new InvalidTokenException("Wrong token type: expected " + expectedType);
            }
            UUID userId = UUID.fromString(c.getSubject());
            String role = c.get(CLAIM_ROLE, String.class);
            String status = c.get(CLAIM_STATUS, String.class);
            return new ParsedToken(userId, role, status);
        } catch (JwtException | IllegalArgumentException e) {
            throw new InvalidTokenException("Invalid or expired token", e);
        }
    }

    /** Decoded claim bundle. {@code role}/{@code status} are null on refresh tokens. */
    public record ParsedToken(UUID userId, String role, String status) {}

    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message) { super(message); }
        public InvalidTokenException(String message, Throwable cause) { super(message, cause); }
    }
}
