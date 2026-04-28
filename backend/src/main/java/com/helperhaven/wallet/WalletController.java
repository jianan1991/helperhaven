package com.helperhaven.wallet;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.wallet.dto.UnlockRequest;
import com.helperhaven.wallet.dto.UnlockView;
import com.helperhaven.wallet.dto.WalletView;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Two endpoints:
 * <ul>
 *   <li>{@code GET /api/wallet/me} — credit balance for the calling user.</li>
 *   <li>{@code POST /api/unlocks} — open or fetch the chat with the given
 *       counterparty, charging 1 credit on first unlock (employers only).</li>
 * </ul>
 */
@RestController
public class WalletController {

    private final WalletService wallet;
    private final UnlockService unlocks;

    public WalletController(WalletService wallet, UnlockService unlocks) {
        this.wallet = wallet;
        this.unlocks = unlocks;
    }

    @GetMapping("/api/wallet/me")
    public WalletView me() {
        WalletService.WalletSnapshot s = wallet.snapshot(JwtAuthFilter.currentUserId());
        return new WalletView(s.balance(), s.reserved());
    }

    @PostMapping("/api/unlocks")
    public UnlockView unlock(@Valid @RequestBody UnlockRequest req) {
        return unlocks.unlock(JwtAuthFilter.currentUserId(), req.counterpartyUserId());
    }
}
