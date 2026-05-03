package com.helperhaven.repo;

import com.helperhaven.domain.PlacementDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlacementDocumentRepository extends JpaRepository<PlacementDocument, UUID> {
    List<PlacementDocument> findByPlacementId(UUID placementId);
    Optional<PlacementDocument> findByPlacementIdAndDocType(UUID placementId, String docType);
}
