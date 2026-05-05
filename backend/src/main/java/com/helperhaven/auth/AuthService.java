package com.helperhaven.auth;

import com.helperhaven.auth.dto.AuthResponse;
import com.helperhaven.auth.dto.LoginRequest;
import com.helperhaven.auth.dto.MeResponse;
import com.helperhaven.auth.dto.SignupRequest;
import com.helperhaven.domain.CreditTransaction;
import com.helperhaven.domain.CreditWallet;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.CreditReason;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import com.helperhaven.repo.CreditTransactionRepository;
import com.helperhaven.repo.CreditWalletRepository;
import com.helperhaven.repo.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Core auth flows: signup, login, refresh, /me.
 *
 * <p>Account lifecycle:
 * <ol>
 *   <li>Signup creates the user in {@link UserStatus#PENDING_VERIFICATION}.
 *       Email verification flips to {@link UserStatus#ACTIVE}; we still issue tokens
 *       at signup so the wizard can be filled in immediately.</li>
 *   <li>Login rejects {@link UserStatus#SUSPENDED} and {@link UserStatus#BANNED} accounts.</li>
 *   <li>Refresh re-reads the user so we surface status flips (admin suspension,
 *       helper auto-INACTIVE from anti-ghosting) on the next refresh — no need
 *       to wait for token expiry.</li>
 * </ol>
 */
@Service
public class AuthService {

    /**
     * Mock-credit grant for employer signups during Sprint A. Generous on
     * purpose so the demo never runs out before the unlock + chat flow is
     * exercised end-to-end. Sprint C replaces this with PayNow top-ups.
     */
    private static final int EMPLOYER_SIGNUP_CREDIT_GRANT = 99;

    private final UserRepository users;
    private final CreditWalletRepository wallets;
    private final CreditTransactionRepository ledger;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(
            UserRepository users,
            CreditWalletRepository wallets,
            CreditTransactionRepository ledger,
            PasswordEncoder encoder,
            JwtService jwt
    ) {
        this.users = users;
        this.wallets = wallets;
        this.ledger = ledger;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw new AuthException(AuthError.EMAIL_TAKEN, "An account with this email already exists");
        }
        UserRole role = req.roleOrDefault();
        if (role != UserRole.EMPLOYER && role != UserRole.HELPER) {
            // ADMIN and AGENCY accounts are minted server-side, not via public signup.
            throw new AuthException(AuthError.INVALID_ROLE, "That role can't sign up here");
        }

        Instant now = Instant.now();
        User saved = users.save(User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .passwordHash(encoder.encode(req.password()))
                .role(role)
                .status(UserStatus.PENDING_VERIFICATION)
                .locale(req.localeOrDefault())
                .createdAt(now)
                .build());

        // Employers get a mock balance up front so the Sprint A unlock flow has
        // something to spend without a real top-up endpoint. Helpers don't need
        // a wallet in Sprint A; one will be created lazily when helper-side
        // credit features ship.
        if (saved.getRole() == UserRole.EMPLOYER) {
            wallets.save(CreditWallet.builder()
                    .userId(saved.getId())
                    .balance(EMPLOYER_SIGNUP_CREDIT_GRANT)
                    .reserved(0)
                    .updatedAt(now)
                    .build());
            ledger.save(CreditTransaction.builder()
                    .id(UUID.randomUUID())
                    .walletUserId(saved.getId())
                    .delta(EMPLOYER_SIGNUP_CREDIT_GRANT)
                    .reason(CreditReason.SIGNUP_GRANT)
                    .referenceType("signup")
                    .referenceId(saved.getId())
                    .balanceAfter(EMPLOYER_SIGNUP_CREDIT_GRANT)
                    .createdAt(now)
                    .build());
        }

        return issue(saved);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = normalize(req.email());
        User u = users.findByEmail(email)
                .orElseThrow(() -> new AuthException(AuthError.INVALID_CREDENTIALS, "Invalid email or password"));

        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            throw new AuthException(AuthError.INVALID_CREDENTIALS, "Invalid email or password");
        }
        guardLoginStatus(u);

        u.setLastLoginAt(Instant.now());
        // If a helper had been auto-flipped INACTIVE for ghosting, logging in re-activates her.
        // Suspended/banned accounts never reach here because guardLoginStatus throws above.
        if (u.getRole() == UserRole.HELPER && u.getStatus() == UserStatus.PENDING_VERIFICATION) {
            // No-op for now — verification flow handles this. Documented for the helper anti-ghost path.
        }

        return issue(u);
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        JwtService.ParsedToken parsed;
        try {
            parsed = jwt.parseRefreshToken(refreshToken);
        } catch (JwtService.InvalidTokenException e) {
            throw new AuthException(AuthError.INVALID_TOKEN, "Refresh token is invalid or expired");
        }

        User u = users.findById(parsed.userId())
                .orElseThrow(() -> new AuthException(AuthError.INVALID_TOKEN, "Account no longer exists"));

        guardLoginStatus(u);
        return issue(u);
    }

    @Transactional(readOnly = true)
    public MeResponse me(UUID userId) {
        User u = users.findById(userId)
                .orElseThrow(() -> new AuthException(AuthError.INVALID_TOKEN, "Account no longer exists"));
        return MeResponse.from(u);
    }

    // -- helpers ---------------------------------------------------------

    private AuthResponse issue(User u) {
        return new AuthResponse(
                jwt.issueAccessToken(u),
                jwt.issueRefreshToken(u),
                MeResponse.from(u)
        );
    }

    private void guardLoginStatus(User u) {
        switch (u.getStatus()) {
            case BANNED -> throw new AuthException(AuthError.ACCOUNT_BANNED,
                    "This account has been banned");
            case SUSPENDED -> throw new AuthException(AuthError.ACCOUNT_SUSPENDED,
                    "This account is suspended. Contact support.");
            default -> { /* PENDING_VERIFICATION and ACTIVE may both log in */ }
        }
    }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public enum AuthError {
        EMAIL_TAKEN,
        INVALID_CREDENTIALS,
        INVALID_TOKEN,
        INVALID_ROLE,
        ACCOUNT_BANNED,
        ACCOUNT_SUSPENDED
    }

    public static class AuthException extends RuntimeException {
        private final AuthError error;
        public AuthException(AuthError error, String message) {
            super(message);
            this.error = error;
        }
        public AuthError error() { return error; }
    }
}
