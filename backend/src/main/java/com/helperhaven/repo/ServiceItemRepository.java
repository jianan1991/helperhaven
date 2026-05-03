package com.helperhaven.repo;

import com.helperhaven.domain.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ServiceItemRepository extends JpaRepository<ServiceItem, UUID> {
    List<ServiceItem> findByActiveTrueOrderBySortOrderAsc();
}
