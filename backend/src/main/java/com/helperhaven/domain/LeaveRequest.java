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
@Table(name = "leave_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveRequest {

    @Id
    private UUID id;

    @Column(name = "placement_id", nullable = false)
    private UUID placementId;

    @Column(name = "requester_user_id", nullable = false)
    private UUID requesterUserId;

    /** ANNUAL | MEDICAL | FAMILY_AWAY */
    @Column(nullable = false, length = 30)
    private String type;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(length = 500)
    private String note;

    /** PENDING | APPROVED | DENIED */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
