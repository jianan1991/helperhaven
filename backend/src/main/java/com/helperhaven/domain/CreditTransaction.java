package com.helperhaven.domain;

import com.helperhaven.domain.enums.CreditReason;
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
 * Append-only ledger row for a wallet movement. The wallet's {@code balance}
 * column is the cached running total; the source of truth is the sum of these
 * deltas. We persist {@code balanceAfter} on each row so an admin reconciler
 * can detect drift without a full re-sum.
 */
@Entity
@Table(name = "credit_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditTransaction {

    @Id
    private UUID id;

    @Column(name = "wallet_user_id", nullable = false)
    private UUID walletUserId;

    /** Negative for spend, positive for grant/refund. */
    @Column(nullable = false)
    private Integer delta;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "credit_reason")
    private CreditReason reason;

    @Column(name = "reference_type")
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
