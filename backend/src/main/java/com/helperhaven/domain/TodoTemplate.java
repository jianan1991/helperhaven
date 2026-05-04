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
import java.util.UUID;

@Entity
@Table(name = "todo_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TodoTemplate {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** DAILY | WEEKDAYS | WEEKENDS | WEEKLY */
    @Column(name = "recurrence_type", nullable = false, length = 20)
    private String recurrenceType;

    /** Bitmask for WEEKLY: bit 0=Mon … bit 6=Sun */
    @Column(name = "days_of_week")
    private Integer daysOfWeek;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
