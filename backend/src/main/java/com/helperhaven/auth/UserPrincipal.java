package com.helperhaven.auth;

import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

/**
 * What we put in the SecurityContext for an authenticated request. Built directly
 * from the JWT claims — no DB hit required for the common authenticated case.
 *
 * <p>The single granted authority follows Spring Security's {@code ROLE_*} convention so
 * {@code @PreAuthorize("hasRole('ADMIN')")} works without any extra mapping.
 */
public record UserPrincipal(UUID id, UserRole role, UserStatus status) {

    public List<GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
