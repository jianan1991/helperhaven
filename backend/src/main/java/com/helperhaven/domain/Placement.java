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
@Table(name = "placements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Placement {

    @Id
    private UUID id;

    @Column(name = "offer_id", nullable = false)
    private UUID offerId;

    @Column(name = "employer_id", nullable = false)
    private UUID employerId;

    @Column(name = "helper_id", nullable = false)
    private UUID helperId;

    /** JWC | DIY */
    @Column(name = "engagement_mode", nullable = false, length = 10)
    private String engagementMode;

    /** INITIATED | DOCS_COLLECTION | MOM_SUBMITTED | IPA_ISSUED | HELPER_ARRIVAL | ACTIVE */
    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
