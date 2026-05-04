package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "todos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Todo {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "sort_order")
    private Integer sortOrder;

    /** Copied from template at materialisation; null for ad-hoc todos */
    @Column(name = "recurrence_type", length = 20)
    private String recurrenceType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
