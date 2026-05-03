package com.helperhaven.repo;

import com.helperhaven.domain.Placement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlacementRepository extends JpaRepository<Placement, UUID> {
    List<Placement> findByEmployerIdOrderByCreatedAtDesc(UUID employerId);
    List<Placement> findByHelperIdOrderByCreatedAtDesc(UUID helperId);
    Optional<Placement> findByOfferId(UUID offerId);
}
