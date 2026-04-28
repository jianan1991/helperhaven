package com.helperhaven.permits;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.domain.PermitCase;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.permits.dto.MarkHiredRequest;
import com.helperhaven.permits.dto.PermitCaseView;
import com.helperhaven.repo.UserRepository;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Sprint A "concierge stub" routes:
 *
 * <ul>
 *   <li>{@code GET /api/permits/with/{counterpartyUserId}} — frontend calls
 *       this to discover whether a permit case already exists with the other
 *       party (drives the "Write review" CTA).</li>
 *   <li>{@code POST /api/permits/demo-mark-hired} — fast-forward the case to
 *       CARD_ISSUED without going through the real concierge flow. Demo-only;
 *       Sprint C replaces this with the wizard.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/permits")
public class PermitController {

    private final PermitService permits;
    private final UserRepository users;

    public PermitController(PermitService permits, UserRepository users) {
        this.permits = permits;
        this.users = users;
    }

    @PostMapping("/demo-mark-hired")
    public PermitCaseView markHired(@Valid @RequestBody MarkHiredRequest req) {
        PermitCase pc = permits.markHiredDemo(JwtAuthFilter.currentUserId(), req.counterpartyUserId());
        return toView(pc);
    }

    @GetMapping("/with/{counterpartyUserId}")
    public PermitCaseView between(@PathVariable UUID counterpartyUserId) {
        UUID me = JwtAuthFilter.currentUserId();
        User u = users.findById(me).orElse(null);
        if (u == null) return null;
        UUID employerId;
        UUID helperId;
        if (u.getRole() == UserRole.EMPLOYER) {
            employerId = me;
            helperId = counterpartyUserId;
        } else {
            employerId = counterpartyUserId;
            helperId = me;
        }
        PermitCase pc = permits.findBetween(employerId, helperId);
        return pc == null ? null : toView(pc);
    }

    private PermitCaseView toView(PermitCase pc) {
        return new PermitCaseView(
                pc.getId(),
                pc.getEmployerUserId(),
                pc.getHelperUserId(),
                pc.getStatus(),
                pc.getStatus().isActiveOrLater()
        );
    }
}
