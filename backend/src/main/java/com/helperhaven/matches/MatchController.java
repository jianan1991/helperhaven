package com.helperhaven.matches;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.matches.dto.MatchView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Single endpoint: {@code GET /api/matches} returns the current user's
 * matches sorted by score descending. The shape is the same regardless of
 * role — frontend renders a uniform card list.
 */
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService matches;

    public MatchController(MatchService matches) {
        this.matches = matches;
    }

    @GetMapping
    public List<MatchView> list() {
        return matches.matchesForCurrentUser(JwtAuthFilter.currentUserId());
    }
}
