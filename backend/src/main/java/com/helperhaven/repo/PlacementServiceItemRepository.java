package com.helperhaven.repo;

import com.helperhaven.domain.PlacementServiceItem;
import com.helperhaven.domain.PlacementServiceItemKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlacementServiceItemRepository extends JpaRepository<PlacementServiceItem, PlacementServiceItemKey> {
    List<PlacementServiceItem> findByIdPlacementId(UUID placementId);
}
