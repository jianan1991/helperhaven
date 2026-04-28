package com.helperhaven.wallet;

import com.helperhaven.chat.ChatService;
import com.helperhaven.chat.dto.ConversationView;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.wallet.dto.UnlockView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Sprint A "mock unlock" flow. Tying chat creation and credit charging together
 * in one service makes the demo path obvious — the controller doesn't need to
 * orchestrate two services and ChatService stays unaware of credits.
 *
 * <p>Charging happens after the conversation row is committed, scoped by the
 * conversation ID, so the WalletService idempotency probe is meaningful.
 *
 * <p>Helpers don't get charged — they have no wallet — but they can still
 * "unlock" via the same endpoint to land on the chat. We just skip the charge.
 */
@Service
public class UnlockService {

    private final ChatService chat;
    private final WalletService wallet;
    private final UserRepository users;

    public UnlockService(ChatService chat, WalletService wallet, UserRepository users) {
        this.chat = chat;
        this.wallet = wallet;
        this.users = users;
    }

    @Transactional
    public UnlockView unlock(UUID currentUserId, UUID counterpartyUserId) {
        User u = users.findById(currentUserId)
                .orElseThrow(() -> new ChatService.ChatException(
                        ChatService.ChatError.USER_NOT_FOUND, "Account not found"));

        ConversationView conv = chat.openOrCreate(currentUserId, counterpartyUserId);

        // Helpers don't pay; only employers burn credits. AGENCY/ADMIN aren't
        // expected to land here in Sprint A, but treat them as no-charge.
        boolean charged = false;
        int balanceAfter;
        if (u.getRole() == UserRole.EMPLOYER) {
            WalletService.ChargeResult r = wallet.chargeForConversation(currentUserId, conv.id());
            balanceAfter = r.balanceAfter();
            charged = r.charged();
        } else {
            balanceAfter = wallet.snapshot(currentUserId).balance();
        }

        return new UnlockView(conv.id(), conv.counterpartyUserId(), balanceAfter, charged);
    }
}
