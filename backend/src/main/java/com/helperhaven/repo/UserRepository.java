package com.helperhaven.repo;

import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneE164(String phoneE164);
    boolean existsByEmail(String email);
    boolean existsByPhoneE164(String phoneE164);
    List<User> findAllByIdIn(Collection<UUID> ids);
    List<User> findAllByRoleAndStatus(UserRole role, UserStatus status);
}
