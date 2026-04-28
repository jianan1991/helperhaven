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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Lite mapping of {@code permit_cases} for Sprint A. The full concierge
 * workflow (documents, MOM submission, security bond, etc.) lands in later
 * sprints — Sprint A only needs to read the status to gate review publishing
 * and write a {@code CARD_ISSUED} row via the demo "mark as hired" endpoint.
 */
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
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "permit_status")
    private PermitStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
