package com.helperhaven.domain.enums;

/**
 * Mirrors the {@code permit_status} Postgres enum. Sprint A only writes
 * {@code CARD_ISSUED} via the demo "mark as hired" endpoint; the full
 * concierge state machine lands in later sprints.
 */
public enum PermitStatus {
    DRAFT,
    DOCS_PENDING,
    SUBMITTED_MOM,
    INTERIM_APPROVED,
    BOND_INSURANCE,
    IPA_ISSUED,
    AWAITING_ARRIVAL,
    ARRIVED,
    SIP_DONE,
    MEDICAL_DONE,
    BIOMETRICS_DONE,
    CARD_ISSUED,
    CANCELLED,
    REJECTED,
    TERMINATED_EARLY_PENDING,
    TERMINATED_EARLY_CLOSED,
    TRANSFER_PENDING,
    TRANSFER_CLOSED;

    /**
     * The contract has reached "active" if a work permit card has been issued
     * (or any of the post-issue states). This is the gate for publishing a
     * public review.
     */
    public boolean isActiveOrLater() {
        return switch (this) {
            case CARD_ISSUED, TERMINATED_EARLY_PENDING, TERMINATED_EARLY_CLOSED,
                 TRANSFER_PENDING, TRANSFER_CLOSED -> true;
            default -> false;
        };
    }
}
