package com.helperhaven.repo;

import com.helperhaven.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneE164(String phoneE164);
    boolean existsByEmail(String email);
    boolean existsByPhoneE164(String phoneE164);
}
