package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-user credit balance. Sprint A seeds 99 credits at employer signup as a
 * mock; Sprint C swaps the source-of-funds to PayNow + admin allocation.
 *
 * <p>{@code reserved} tracks credits held against pending unlocks — they're not
 * spendable but not yet burned either. Burn happens on helper first reply;
 * release happens on auto-refund (Sprint B) or manual refund (Sprint C).
 */
@Entity
@Table(name = "credit_wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditWallet {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private Integer balance;

    @Column(nullable = false)
    private Integer reserved;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
