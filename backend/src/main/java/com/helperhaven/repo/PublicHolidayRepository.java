package com.helperhaven.repo;

import com.helperhaven.domain.PublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PublicHolidayRepository extends JpaRepository<PublicHoliday, UUID> {
    List<PublicHoliday> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);
    boolean existsByHolidayDate(LocalDate date);
}
