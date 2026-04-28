package com.helperhaven.domain;

import com.helperhaven.domain.enums.EnglishLevel;
import com.helperhaven.domain.enums.ReviewContext;
import com.helperhaven.domain.enums.ReviewKind;
import com.helperhaven.domain.enums.ReviewVisibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Combined V1 + V3 review row. Sprint A writes one EMPLOYER_ON_HELPER and one
 * HELPER_ON_EMPLOYER per permit case at most (enforced by V3's partial unique
 * index). The {@code skillBreakdown} JSON and {@code flagTags} array let the
 * employer give a structured answer about how the helper actually performed
 * once the placement is real.
 */
@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    private UUID id;

    @Column(name = "reviewer_user_id", nullable = false)
    private UUID reviewerUserId;

    @Column(name = "reviewee_user_id", nullable = false)
    private UUID revieweeUserId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "review_context")
    private ReviewContext context;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(nullable = false)
    private Short rating;

    @Column
    private String body;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "review_visibility")
    private ReviewVisibility visibility;

    // ---- V3 additions ----

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "review_kind")
    private ReviewKind kind;

    @Column(name = "permit_case_id")
    private UUID permitCaseId;

    /** {"infant": 33, "elderly": 28, ...} — Hibernate Jackson handles JSONB conversion. */
    @Column(name = "skill_breakdown", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Integer> skillBreakdown;

    @Column(name = "flag_tags", columnDefinition = "text[]")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private String[] flagTags;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "english_level", columnDefinition = "english_level")
    private EnglishLevel englishLevel;

    @Column(name = "months_into_contract")
    private Integer monthsIntoContract;

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
