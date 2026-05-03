package com.helperhaven.interests;

import com.helperhaven.auth.UserPrincipal;
import com.helperhaven.domain.HelperInterest;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.HelperInterestRepository;
import com.helperhaven.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Helper-only: express or withdraw interest in an employer.
 * POST /api/interests/{employerId}   → express interest (idempotent)
 * DELETE /api/interests/{employerId} → withdraw interest
 */
@RestController
@RequestMapping("/api/interests")
public class InterestController {

    private static final Duration INTEREST_TTL = Duration.ofDays(7);
    private static final int MAX_ACTIVE_INTERESTS = 5;

    private final HelperInterestRepository repo;
    private final UserRepository users;

    public InterestController(HelperInterestRepository repo, UserRepository users) {
        this.repo  = repo;
        this.users = users;
    }

    @PostMapping("/{employerId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> express(@PathVariable UUID employerId) {
        UUID helperId = requireHelper();
        users.findById(employerId)
                .filter(u -> u.getRole() == UserRole.EMPLOYER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found"));

        Instant now = Instant.now();
        Instant cutoff = now.minus(INTEREST_TTL);

        // Already active for this employer — idempotent, return existing expiry.
        var existing = repo.findById(new HelperInterest.PK(helperId, employerId)).orElse(null);
        if (existing != null && existing.getExpressedAt().isAfter(cutoff)) {
            String expiresAt = existing.getExpressedAt().plus(INTEREST_TTL).toString();
            return ResponseEntity.ok(Map.of("interested", true, "interestExpiresAt", expiresAt));
        }

        long active = repo.countActiveByHelperId(helperId, cutoff);
        if (active >= MAX_ACTIVE_INTERESTS) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "You can only raise your hand for " + MAX_ACTIVE_INTERESTS + " families at a time. Withdraw one to free a slot.");
        }

        // Delete any expired record for this pair before inserting fresh.
        repo.deleteByHelperIdAndEmployerId(helperId, employerId);
        repo.save(HelperInterest.builder()
                .helperId(helperId)
                .employerId(employerId)
                .expressedAt(now)
                .build());
        return ResponseEntity.ok(Map.of("interested", true, "interestExpiresAt", now.plus(INTEREST_TTL).toString()));
    }

    @DeleteMapping("/{employerId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> withdraw(@PathVariable UUID employerId) {
        UUID helperId = requireHelper();
        repo.deleteByHelperIdAndEmployerId(helperId, employerId);
        return ResponseEntity.ok(Map.of("interested", false));
    }

    // Read role from the JWT principal — avoids a DB round-trip and works correctly
    // even when the in-memory H2 DB is wiped between restarts (new seed UUIDs).
    private UUID requireHelper() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal up)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        if (up.role() != UserRole.HELPER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only helpers can raise hand. Your current account role is: " + up.role()
                    + ". Please sign out and log in with a helper account.");
        }
        return up.id();
    }
}
