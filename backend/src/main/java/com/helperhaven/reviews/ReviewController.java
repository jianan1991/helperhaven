package com.helperhaven.reviews;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.reviews.dto.ReviewView;
import com.helperhaven.reviews.dto.WriteReviewRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Review HTTP surface.
 *
 * <ul>
 *   <li>{@code POST /api/reviews} — write a review for a counterparty (gated
 *       on an active permit case in the service layer).</li>
 *   <li>{@code GET /api/reviews/of/{userId}} — public reviews of someone, used
 *       on profile pages and in match details.</li>
 *   <li>{@code GET /api/reviews/me} — the calling user's own reviews-of-them.</li>
 *   <li>{@code GET /api/reviews/by-me} — reviews the calling user has authored.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviews;

    public ReviewController(ReviewService reviews) {
        this.reviews = reviews;
    }

    @PostMapping
    public ReviewView write(@Valid @RequestBody WriteReviewRequest req) {
        return reviews.create(JwtAuthFilter.currentUserId(), req);
    }

    @GetMapping("/of/{userId}")
    public List<ReviewView> publicReviewsOf(@PathVariable UUID userId) {
        return reviews.publicReviewsOf(userId);
    }

    @GetMapping("/me")
    public List<ReviewView> myReceived() {
        return reviews.publicReviewsOf(JwtAuthFilter.currentUserId());
    }

    @GetMapping("/by-me")
    public List<ReviewView> myAuthored() {
        return reviews.writtenBy(JwtAuthFilter.currentUserId());
    }
}
