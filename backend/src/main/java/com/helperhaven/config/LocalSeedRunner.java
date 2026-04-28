package com.helperhaven.config;

import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import com.helperhaven.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/**
 * Demo seed for the {@code local} profile only. Idempotent: each user is created
 * once and skipped on subsequent boots.
 *
 * <p>Currently seeds a single ADMIN account so you can sign in and exercise the
 * admin surfaces without going through the public signup flow (which deliberately
 * blocks ADMIN/AGENCY roles).
 *
 * <p><b>Never enable in prod.</b> The {@code @Profile("local")} guard is what keeps
 * this from running on the deployed stack — application-prod.yml does not
 * activate this profile.
 */
@Component
@Profile("local")
public class LocalSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalSeedRunner.class);

    // Demo creds — fine to commit because this only runs against a local DB.
    static final String ADMIN_EMAIL = "admin@helperhaven.local";
    static final String ADMIN_PASSWORD = "Admin12345!";

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public LocalSeedRunner(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        seedAdmin();
    }

    private void seedAdmin() {
        if (users.existsByEmail(ADMIN_EMAIL)) {
            log.info("[seed] admin already exists ({}), skipping", ADMIN_EMAIL);
            return;
        }
        Instant now = Instant.now();
        users.save(User.builder()
                .id(UUID.randomUUID())
                .email(ADMIN_EMAIL)
                .passwordHash(encoder.encode(ADMIN_PASSWORD))
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .locale("en")
                .emailVerifiedAt(now)
                .createdAt(now)
                .build());
        log.info("[seed] ──────────────────────────────────────────────");
        log.info("[seed] Created demo ADMIN account (local profile only)");
        log.info("[seed]   email:    {}", ADMIN_EMAIL);
        log.info("[seed]   password: {}", ADMIN_PASSWORD);
        log.info("[seed] ──────────────────────────────────────────────");
    }
}
