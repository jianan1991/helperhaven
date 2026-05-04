package com.helperhaven.repo;

import com.helperhaven.domain.TerminationRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TerminationRequestRepository extends JpaRepository<TerminationRequest, UUID> {
    List<TerminationRequest> findAllByOrderByCreatedAtDesc();
    Optional<TerminationRequest> findByPlacementIdAndStatus(UUID placementId, String status);
}
