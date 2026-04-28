package com.helperhaven.domain;

import com.helperhaven.domain.enums.HousingType;
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
import java.util.UUID;

/**
 * Employer profile — keyed by {@code user_id} (1:1 with the {@link User}). The
 * five-vector preference weights ({@code weight_*}) live here as named columns
 * mirroring the helper's score columns. Both 5-vectors form the inputs to the
 * Sprint A match-score dot-product.
 */
@Entity
@Table(name = "employer_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployerProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "household_size", nullable = false)
    private Short householdSize;

    @Column(name = "num_children", nullable = false)
    private Short numChildren;

    @Column(name = "num_elderly", nullable = false)
    private Short numElderly;

    @Column(name = "has_pets", nullable = false)
    private Boolean hasPets;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "housing_type")
    private HousingType housing;

    private String district;

    @Column(name = "salary_offer_sgd_min")
    private Integer salaryOfferSgdMin;

    @Column(name = "salary_offer_sgd_max")
    private Integer salaryOfferSgdMax;

    @Column(name = "off_day_policy")
    private String offDayPolicy;

    @Column(name = "hiring_purpose", columnDefinition = "text")
    private String hiringPurpose;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "purpose_tags", columnDefinition = "text[]")
    private String[] purposeTags;

    // 5-metric weight vector — sum-to-100 enforced at service layer.
    @Column(name = "weight_infant")
    private Short weightInfant;

    @Column(name = "weight_elderly")
    private Short weightElderly;

    @Column(name = "weight_cooking")
    private Short weightCooking;

    @Column(name = "weight_house")
    private Short weightHouse;

    @Column(name = "weight_attitude")
    private Short weightAttitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
