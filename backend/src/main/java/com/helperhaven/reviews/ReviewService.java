package com.helperhaven.reviews;

import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.PermitCase;
import com.helperhaven.domain.Review;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.ReviewContext;
import com.helperhaven.domain.enums.ReviewKind;
import com.helperhaven.domain.enums.ReviewVisibility;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.PermitCaseRepository;
import com.helperhaven.repo.ReviewRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.reviews.dto.ReviewView;
import com.helperhaven.reviews.dto.WriteReviewRequest;
import com.helperhaven.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Sprint A reviews. Two operations:
 *
 * <ol>
 *   <li><b>Create</b>: requires an active permit_case (status &ge; CARD_ISSUED).
 *       Reviews are PUBLIC by default — the V3 CHECK constraint refuses any
 *       PUBLIC review without a permit case anyway, so we enforce the same
 *       at the service layer with a friendlier error.</li>
 *   <li><b>Read</b>: fetch the public reviews of a user, with reviewer name
 *       + photo hydrated server-side so the UI can render a card directly.</li>
 * </ol>
 *
 * <p>The 5-vector skill breakdown and the canonical flag tags ({@code punctual},
 * {@code honest}, {@code patient}, {@code kind_to_elderly}, {@code willing_to_learn})
 * give recruiters something more useful than a star rating to pattern-match on.
 */
@Service
public class ReviewService {

    private static final Duration PHOTO_GET_TTL = Duration.ofHours(1);

    /** The five canonical skill keys — must match {@code FiveVector} on the helper side. */
    private static final Set<String> SKILL_KEYS =
            Set.of("infant", "elderly", "cooking", "house", "attitude");

    /** Five canonical flag tags surfaced on review cards. */
    private static final Set<String> FLAG_TAGS =
            Set.of("punctual", "honest", "patient", "kind_to_elderly", "willing_to_learn");

    private final ReviewRepository reviews;
    private final PermitCaseRepository permits;
    private final UserRepository users;
    private final HelperProfileRepository helpers;
    private final EmployerProfileRepository employers;
    private final FileStorage storage;

    public ReviewService(
            ReviewRepository reviews,
            PermitCaseRepository permits,
            UserRepository users,
            HelperProfileRepository helpers,
            EmployerProfileRepository employers,
            FileStorage storage
    ) {
        this.reviews = reviews;
        this.permits = permits;
        this.users = users;
        this.helpers = helpers;
        this.employers = employers;
        this.storage = storage;
    }

    // ---------------------------------------------------------------- create

    @Transactional
    public ReviewView create(UUID reviewerId, WriteReviewRequest req) {
        if (reviewerId.equals(req.revieweeUserId())) {
            throw new ReviewException(ReviewError.SELF_REVIEW, "You can't review yourself");
        }
        User reviewer = users.findById(reviewerId)
                .orElseThrow(() -> new ReviewException(ReviewError.USER_NOT_FOUND, "Account not found"));
        User reviewee = users.findById(req.revieweeUserId())
                .orElseThrow(() -> new ReviewException(ReviewError.USER_NOT_FOUND, "That user no longer exists"));

        // Determine kind + permit_case orientation from roles.
        ReviewKind kind;
        UUID employerId;
        UUID helperId;
        if (reviewer.getRole() == UserRole.EMPLOYER && reviewee.getRole() == UserRole.HELPER) {
            kind = ReviewKind.EMPLOYER_ON_HELPER;
            employerId = reviewer.getId();
            helperId = reviewee.getId();
        } else if (reviewer.getRole() == UserRole.HELPER && reviewee.getRole() == UserRole.EMPLOYER) {
            kind = ReviewKind.HELPER_ON_EMPLOYER;
            employerId = reviewee.getId();
            helperId = reviewer.getId();
        } else {
            throw new ReviewException(ReviewError.WRONG_ROLES,
                    "Reviews must be between an employer and a helper");
        }

        // Gate: there must be an active contract.
        PermitCase pc = permits.findFirstByEmployerUserIdAndHelperUserId(employerId, helperId)
                .orElseThrow(() -> new ReviewException(ReviewError.NOT_HIRED,
                        "You can only review someone after the work permit is issued"));
        if (!pc.getStatus().isActiveOrLater()) {
            throw new ReviewException(ReviewError.NOT_HIRED,
                    "Reviews unlock once the work permit reaches CARD_ISSUED");
        }

        // One review per (reviewer, permit_case, kind) — V3's partial unique index.
        reviews.findFirstByReviewerUserIdAndPermitCaseIdAndKind(reviewerId, pc.getId(), kind)
                .ifPresent(r -> {
                    throw new ReviewException(ReviewError.ALREADY_REVIEWED,
                            "You've already left a review for this contract");
                });

        validateBreakdown(req.skillBreakdown());
        validateFlagTags(req.flagTags());

        Instant now = Instant.now();
        Review row = Review.builder()
                .id(UUID.randomUUID())
                .reviewerUserId(reviewerId)
                .revieweeUserId(req.revieweeUserId())
                .context(ReviewContext.PLACEMENT)
                .referenceId(pc.getId())
                .rating((short) req.rating())
                .body(req.body() == null || req.body().isBlank() ? null : req.body().strip())
                .visibility(ReviewVisibility.PUBLIC)
                .kind(kind)
                .permitCaseId(pc.getId())
                .skillBreakdown(req.skillBreakdown())
                .flagTags(req.flagTags() == null ? new String[0] : req.flagTags().toArray(new String[0]))
                .englishLevel(req.englishLevel())
                .monthsIntoContract(req.monthsIntoContract())
                .createdAt(now)
                .build();
        Review saved = reviews.save(row);
        return toView(saved);
    }

    // ---------------------------------------------------------------- read

    @Transactional(readOnly = true)
    public List<ReviewView> publicReviewsOf(UUID userId) {
        List<Review> rows = reviews.findByRevieweeUserIdAndVisibilityOrderByCreatedAtDesc(
                userId, ReviewVisibility.PUBLIC);
        List<ReviewView> out = new ArrayList<>(rows.size());
        for (Review r : rows) out.add(toView(r));
        return out;
    }

    @Transactional(readOnly = true)
    public List<ReviewView> writtenBy(UUID userId) {
        List<Review> rows = reviews.findByReviewerUserIdOrderByCreatedAtDesc(userId);
        List<ReviewView> out = new ArrayList<>(rows.size());
        for (Review r : rows) out.add(toView(r));
        return out;
    }

    // ---------------------------------------------------------------- helpers

    private void validateBreakdown(Map<String, Integer> breakdown) {
        if (breakdown == null) return; // optional
        if (!breakdown.keySet().equals(SKILL_KEYS)) {
            throw new ReviewException(ReviewError.BAD_BREAKDOWN,
                    "Skill breakdown must use the 5 canonical keys: " + SKILL_KEYS);
        }
        int sum = 0;
        for (Integer v : breakdown.values()) {
            if (v == null || v < 0 || v > 100) {
                throw new ReviewException(ReviewError.BAD_BREAKDOWN, "Each skill score must be 0-100");
            }
            sum += v;
        }
        if (sum != 100) {
            throw new ReviewException(ReviewError.BAD_BREAKDOWN,
                    "Skill breakdown must sum to 100 (got " + sum + ")");
        }
    }

    private void validateFlagTags(List<String> tags) {
        if (tags == null) return;
        for (String t : tags) {
            if (!FLAG_TAGS.contains(t)) {
                throw new ReviewException(ReviewError.BAD_FLAG_TAG,
                        "Unknown flag tag '" + t + "'. Allowed: " + FLAG_TAGS);
            }
        }
    }

    private ReviewView toView(Review r) {
        Reviewer rev = lookupReviewer(r.getReviewerUserId());
        return new ReviewView(
                r.getId(),
                r.getReviewerUserId(),
                rev.displayName(),
                rev.photoUrl(),
                r.getRevieweeUserId(),
                r.getKind(),
                r.getVisibility(),
                r.getRating() == null ? 0 : r.getRating().intValue(),
                r.getBody(),
                r.getSkillBreakdown(),
                r.getFlagTags() == null ? List.of() : List.of(r.getFlagTags()),
                r.getEnglishLevel(),
                r.getMonthsIntoContract(),
                r.getCreatedAt()
        );
    }

    private Reviewer lookupReviewer(UUID userId) {
        User u = users.findById(userId).orElse(null);
        if (u == null) return new Reviewer("Unknown", null);
        switch (u.getRole()) {
            case HELPER -> {
                HelperProfile h = helpers.findById(userId).orElse(null);
                if (h != null) return new Reviewer(
                        h.getDisplayFirstName() == null ? "Helper" : h.getDisplayFirstName(),
                        signedPhoto(h.getPhotoUrl())
                );
            }
            case EMPLOYER -> {
                EmployerProfile e = employers.findById(userId).orElse(null);
                if (e != null) {
                    String name = e.getFullName();
                    if (name == null || name.isBlank()) {
                        name = "Family in " + (e.getDistrict() == null ? "SG" : e.getDistrict());
                    }
                    return new Reviewer(name, null);
                }
            }
            default -> { /* ADMIN/AGENCY: fall through */ }
        }
        return new Reviewer(u.getEmail() == null ? "Unknown" : u.getEmail(), null);
    }

    private String signedPhoto(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) return null;
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) return keyOrUrl;
        return storage.signedGetUrl(keyOrUrl, PHOTO_GET_TTL);
    }

    private record Reviewer(String displayName, String photoUrl) {}

    // ---------------------------------------------------------------- errors

    public enum ReviewError {
        USER_NOT_FOUND,
        WRONG_ROLES,
        SELF_REVIEW,
        NOT_HIRED,
        ALREADY_REVIEWED,
        BAD_BREAKDOWN,
        BAD_FLAG_TAG
    }

    public static class ReviewException extends RuntimeException {
        private final ReviewError error;
        public ReviewException(ReviewError error, String message) {
            super(message);
            this.error = error;
        }
        public ReviewError error() { return error; }
    }
}
