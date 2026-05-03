package com.helperhaven.domain;

import com.helperhaven.domain.enums.EnglishLevel;
import com.helperhaven.domain.enums.ReviewContext;
import com.helperhaven.domain.enums.ReviewKind;
import com.helperhaven.domain.enums.ReviewVisibility;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
    @Column(nullable = false)
    private ReviewContext context;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(nullable = false)
    private Short rating;

    @Column
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewVisibility visibility;

    @Enumerated(EnumType.STRING)
    @Column
    private ReviewKind kind;

    @Column(name = "permit_case_id")
    private UUID permitCaseId;

    @Column(name = "skill_breakdown")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Integer> skillBreakdown;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "flag_tags")
    private String[] flagTags;

    @Enumerated(EnumType.STRING)
    @Column(name = "english_level")
    private EnglishLevel englishLevel;

    @Column(name = "months_into_contract")
    private Integer monthsIntoContract;

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
