package com.helperhaven.repo;

import com.helperhaven.domain.CreditTransaction;
import com.helperhaven.domain.enums.CreditReason;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, UUID> {

    /**
     * Idempotency probe for unlock-charging: has this wallet ever been
     * charged against this reference (a conversation, in Sprint A)?
     */
    Optional<CreditTransaction> findFirstByWalletUserIdAndReferenceTypeAndReferenceIdAndReason(
            UUID walletUserId,
            String referenceType,
            UUID referenceId,
            CreditReason reason
    );
}
