package com.helperhaven.repo;

import com.helperhaven.domain.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TodoRepository extends JpaRepository<Todo, UUID> {
    // Template-linked todos for a date (recurring), ordered by sortOrder
    List<Todo> findByPlacementIdAndDueDateAndTemplateIdIsNotNullOrderBySortOrderAscCreatedAtAsc(UUID placementId, LocalDate dueDate);
    // Ad-hoc todos for a date, ordered by creation
    List<Todo> findByPlacementIdAndDueDateAndTemplateIdIsNullOrderByCreatedAtAsc(UUID placementId, LocalDate dueDate);
    // Check if a template has already been materialized for a given date
    boolean existsByPlacementIdAndTemplateIdAndDueDate(UUID placementId, UUID templateId, LocalDate dueDate);
    List<Todo> findByPlacementIdOrderByDueDateDescCreatedAtAsc(UUID placementId);
}
