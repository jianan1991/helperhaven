package com.helperhaven.wallet;

import com.helperhaven.domain.CreditTransaction;
import com.helperhaven.domain.CreditWallet;
import com.helperhaven.domain.enums.CreditReason;
import com.helperhaven.repo.CreditTransactionRepository;
import com.helperhaven.repo.CreditWalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Wallet read/write service. Movements are recorded as append-only ledger rows
 * in {@code credit_transactions}; the {@code credit_wallets.balance} column is
 * the cached running sum and is bumped atomically inside the same transaction.
 *
 * <p>Sprint A only burns 1 credit per chat unlock and seeds 99 at signup. The
 * reserve/release dance for refundable holds lands in Sprint B alongside the
 * 48-hour auto-refund sweep job.
 */
@Service
public class WalletService {

    public static final String REF_TYPE_CONVERSATION = "conversation";

    private final CreditWalletRepository wallets;
    private final CreditTransactionRepository ledger;

    public WalletService(CreditWalletRepository wallets, CreditTransactionRepository ledger) {
        this.wallets = wallets;
        this.ledger = ledger;
    }

    /** Returns 0 if no wallet (e.g. helper accounts in Sprint A). */
    @Transactional(readOnly = true)
    public WalletSnapshot snapshot(UUID userId) {
        return wallets.findById(userId)
                .map(w -> new WalletSnapshot(w.getBalance(), w.getReserved()))
                .orElse(new WalletSnapshot(0, 0));
    }

    /**
     * Charge 1 credit for unlocking the given conversation. Idempotent: if a
     * UNLOCK_BURN ledger row already exists for this {@code (user, conversation)}
     * pair we return the current balance untouched. Designed so the frontend
     * can replay the click without double-charging.
     *
     * @return the balance after the charge (or unchanged if already paid)
     * @throws WalletException with code NO_WALLET if the user has no wallet,
     *         INSUFFICIENT_FUNDS if balance is zero
     */
    @Transactional
    public ChargeResult chargeForConversation(UUID userId, UUID conversationId) {
        Optional<CreditTransaction> existing = ledger
                .findFirstByWalletUserIdAndReferenceTypeAndReferenceIdAndReason(
                        userId, REF_TYPE_CONVERSATION, conversationId, CreditReason.UNLOCK_BURN);
        if (existing.isPresent()) {
            int current = wallets.findById(userId).map(CreditWallet::getBalance).orElse(0);
            return new ChargeResult(current, false);
        }

        CreditWallet w = wallets.findById(userId)
                .orElseThrow(() -> new WalletException(WalletError.NO_WALLET, "No credit wallet for this user"));
        if (w.getBalance() < 1) {
            throw new WalletException(WalletError.INSUFFICIENT_FUNDS, "Not enough credits to unlock");
        }

        Instant now = Instant.now();
        int newBalance = w.getBalance() - 1;
        w.setBalance(newBalance);
        w.setUpdatedAt(now);

        ledger.save(CreditTransaction.builder()
                .id(UUID.randomUUID())
                .walletUserId(userId)
                .delta(-1)
                .reason(CreditReason.UNLOCK_BURN)
                .referenceType(REF_TYPE_CONVERSATION)
                .referenceId(conversationId)
                .balanceAfter(newBalance)
                .createdAt(now)
                .build());

        return new ChargeResult(newBalance, true);
    }

    public record WalletSnapshot(int balance, int reserved) {}

    public record ChargeResult(int balanceAfter, boolean charged) {}

    public enum WalletError { NO_WALLET, INSUFFICIENT_FUNDS }

    public static class WalletException extends RuntimeException {
        private final WalletError error;
        public WalletException(WalletError error, String message) {
            super(message);
            this.error = error;
        }
        public WalletError error() { return error; }
    }
}
