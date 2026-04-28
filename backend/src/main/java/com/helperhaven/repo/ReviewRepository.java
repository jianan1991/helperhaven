package com.helperhaven.repo;

import com.helperhaven.domain.Review;
import com.helperhaven.domain.enums.ReviewKind;
import com.helperhaven.domain.enums.ReviewVisibility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    /**
     * Has this reviewer already written this kind of review for this permit case?
     * Used to short-circuit the V3 unique index instead of relying on a constraint
     * violation.
     */
    Optional<Review> findFirstByReviewerUserIdAndPermitCaseIdAndKind(
            UUID reviewerUserId, UUID permitCaseId, ReviewKind kind);

    /** Public reviews of a user, newest first. */
    List<Review> findByRevieweeUserIdAndVisibilityOrderByCreatedAtDesc(
            UUID revieweeUserId, ReviewVisibility visibility);

    /** Reviews authored by a user, newest first. */
    List<Review> findByReviewerUserIdOrderByCreatedAtDesc(UUID reviewerUserId);
}
