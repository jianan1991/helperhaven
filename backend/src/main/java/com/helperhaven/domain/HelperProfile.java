package com.helperhaven.domain;

import com.helperhaven.domain.enums.Nationality;
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
import java.time.LocalDate;
import java.util.UUID;

/**
 * Helper profile — keyed by {@code user_id} (1:1 with the {@link User}). The
 * five-vector skill scores ({@code score_*}) live here as named columns so the
 * matching dot-product is a trivial query rather than a join through
 * {@code helper_skills}. The detailed per-skill ratings in {@code helper_skills}
 * stay for richer filtering in later sprints.
 */
@Entity
@Table(name = "helper_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HelperProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "display_first_name", nullable = false)
    private String displayFirstName;

    @Column(name = "full_name")
    private String fullName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "nationality_t")
    private Nationality nationality;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(name = "years_experience", nullable = false)
    private Short yearsExperience;

    private String religion;

    @Column(name = "marital_status")
    private String maritalStatus;

    private String education;

    @Column(columnDefinition = "text")
    private String bio;

    @Column(name = "height_cm")
    private Short heightCm;

    @Column(name = "weight_kg")
    private Short weightKg;

    @Column(name = "willing_live_in", nullable = false)
    private Boolean willingLiveIn;

    @Column(name = "expected_salary_sgd")
    private Integer expectedSalarySgd;

    @Column(name = "available_from")
    private LocalDate availableFrom;

    @Column(name = "current_location")
    private String currentLocation;

    @Column(name = "photo_url")
    private String photoUrl;

    // 5-vector skill scores — sum-to-100 enforced at service layer.
    @Column(name = "score_infant")
    private Short scoreInfant;

    @Column(name = "score_elderly")
    private Short scoreElderly;

    @Column(name = "score_cooking")
    private Short scoreCooking;

    @Column(name = "score_house")
    private Short scoreHouse;

    @Column(name = "score_attitude")
    private Short scoreAttitude;

    @Column(name = "in_sg_since")
    private LocalDate inSgSince;

    @Column(name = "available_for_transfer", nullable = false)
    private Boolean availableForTransfer;

    @Column(name = "transfer_available_from")
    private LocalDate transferAvailableFrom;

    @Column(name = "current_employer_user_id")
    private UUID currentEmployerUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
