package com.helperhaven.domain.enums;

/**
 * Mirrors the {@code credit_reason} Postgres enum (V1 + V3 additions).
 *
 * <ul>
 *   <li>{@code PURCHASE} — credits added by a successful payment.</li>
 *   <li>{@code UNLOCK_RESERVE} — held against a pending unlock; not spendable.</li>
 *   <li>{@code UNLOCK_BURN} — committed spend (Sprint A uses this for the chat
 *       unlock charge directly; the reserve→burn dance lands in Sprint B).</li>
 *   <li>{@code UNLOCK_RELEASE} — reserved credits handed back when an unlock
 *       expires before the counterparty replies.</li>
 *   <li>{@code UNLOCK_REFUND_AUTO} — swept-back credits after 48h of helper silence.</li>
 *   <li>{@code UNLOCK_REFUND_MANUAL} — employer-triggered refund.</li>
 *   <li>{@code ADMIN_ADJUST} — admin console adjustment.</li>
 *   <li>{@code REFUND} — payment-level refund (chargeback, etc.).</li>
 * </ul>
 */
public enum CreditReason {
    PURCHASE,
    UNLOCK_RESERVE,
    UNLOCK_BURN,
    UNLOCK_RELEASE,
    UNLOCK_REFUND_AUTO,
    UNLOCK_REFUND_MANUAL,
    ADMIN_ADJUST,
    REFUND,
    SIGNUP_GRANT
}
