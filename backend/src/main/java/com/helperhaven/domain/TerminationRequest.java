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
@Table(name = "termination_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TerminationRequest {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "requested_by_user_id", nullable = false)
    private UUID requestedByUserId;

    @Column(length = 1000)
    private String reason;

    /** PENDING | RESOLVED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "admin_notes", length = 1000)
    private String adminNotes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;
}
