package com.helperhaven.repo;

import com.helperhaven.domain.PermitCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PermitCaseRepository extends JpaRepository<PermitCase, UUID> {

    /**
     * Sprint A demo: assume one permit case per (employer, helper) pair. The
     * real concierge can have terminated/transferred history; that lands in
     * Sprint C alongside termination_cases.
     */
    Optional<PermitCase> findFirstByEmployerUserIdAndHelperUserId(UUID employerUserId, UUID helperUserId);
}
