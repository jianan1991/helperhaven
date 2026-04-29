package com.helperhaven.domain;

import com.helperhaven.domain.enums.HousingType;
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

import java.time.Instant;
import java.util.UUID;

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
    @Column(nullable = false)
    private HousingType housing;

    private String district;

    @Column(name = "salary_offer_sgd_min")
    private Integer salaryOfferSgdMin;

    @Column(name = "salary_offer_sgd_max")
    private Integer salaryOfferSgdMax;

    @Column(name = "off_day_policy")
    private String offDayPolicy;

    @Column(name = "preferred_language")
    private String preferredLanguage;

    @Column(name = "hiring_purpose")
    private String hiringPurpose;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "purpose_tags")
    private String[] purposeTags;

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
