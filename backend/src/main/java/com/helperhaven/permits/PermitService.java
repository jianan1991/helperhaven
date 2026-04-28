package com.helperhaven.permits;

import com.helperhaven.domain.PermitCase;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.PermitStatus;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.PermitCaseRepository;
import com.helperhaven.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Sprint A "concierge stub". The real concierge wizard (document upload, MOM
 * submission, IPA tracking, security bond) lands in Sprint C; for the Sprint A
 * demo we expose a single endpoint that fast-forwards a permit case to
 * {@code CARD_ISSUED}. That status is what the review system uses as the
 * gate for publishing public reviews.
 *
 * <p>Idempotent: calling {@link #markHiredDemo} twice for the same employer +
 * helper returns the same permit case row.
 */
@Service
public class PermitService {

    private final PermitCaseRepository permits;
    private final UserRepository users;

    public PermitService(PermitCaseRepository permits, UserRepository users) {
        this.permits = permits;
        this.users = users;
    }

    @Transactional
    public PermitCase markHiredDemo(UUID currentUserId, UUID counterpartyUserId) {
        User me = users.findById(currentUserId)
                .orElseThrow(() -> new PermitException(PermitError.USER_NOT_FOUND, "Account not found"));
        User them = users.findById(counterpartyUserId)
                .orElseThrow(() -> new PermitException(PermitError.USER_NOT_FOUND, "That user no longer exists"));

        UUID employerId;
        UUID helperId;
        if (me.getRole() == UserRole.EMPLOYER && them.getRole() == UserRole.HELPER) {
            employerId = me.getId();
            helperId = them.getId();
        } else if (me.getRole() == UserRole.HELPER && them.getRole() == UserRole.EMPLOYER) {
            employerId = them.getId();
            helperId = me.getId();
        } else {
            throw new PermitException(PermitError.WRONG_ROLE,
                    "A permit case requires one employer and one helper");
        }

        Instant now = Instant.now();
        PermitCase existing = permits.findFirstByEmployerUserIdAndHelperUserId(employerId, helperId)
                .orElse(null);
        if (existing != null) {
            // Bump status forward if it isn't already at CARD_ISSUED — the demo
            // flow assumes one click moves us straight to "active contract".
            if (existing.getStatus() != PermitStatus.CARD_ISSUED) {
                existing.setStatus(PermitStatus.CARD_ISSUED);
                existing.setUpdatedAt(now);
            }
            return existing;
        }

        PermitCase fresh = PermitCase.builder()
                .id(UUID.randomUUID())
                .employerUserId(employerId)
                .helperUserId(helperId)
                .matchId(null) // Sprint A doesn't write matches rows
                .status(PermitStatus.CARD_ISSUED)
                .createdAt(now)
                .updatedAt(now)
                .build();
        return permits.save(fresh);
    }

    @Transactional(readOnly = true)
    public PermitCase findBetween(UUID employerId, UUID helperId) {
        return permits.findFirstByEmployerUserIdAndHelperUserId(employerId, helperId).orElse(null);
    }

    public enum PermitError { USER_NOT_FOUND, WRONG_ROLE }

    public static class PermitException extends RuntimeException {
        private final PermitError error;
        public PermitException(PermitError error, String message) {
            super(message);
            this.error = error;
        }
        public PermitError error() { return error; }
    }
}
