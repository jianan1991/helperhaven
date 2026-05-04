package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "public_holidays")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicHoliday {

    @Id
    private UUID id;

    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
