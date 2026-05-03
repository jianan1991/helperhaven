package com.helperhaven.domain;

import com.helperhaven.domain.enums.PermitStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "permit_cases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermitCase {

    @Id
    private UUID id;

    @Column(name = "employer_user_id", nullable = false)
    private UUID employerUserId;

    @Column(name = "helper_user_id", nullable = false)
    private UUID helperUserId;

    @Column(name = "match_id")
    private UUID matchId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermitStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
