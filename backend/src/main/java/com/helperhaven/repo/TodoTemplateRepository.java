package com.helperhaven.repo;

import com.helperhaven.domain.TodoTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TodoTemplateRepository extends JpaRepository<TodoTemplate, UUID> {
    List<TodoTemplate> findByPlacementIdOrderBySortOrderAscCreatedAtAsc(UUID placementId);
    int countByPlacementId(UUID placementId);
}
