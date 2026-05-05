package com.helperhaven.repo;

import com.helperhaven.domain.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    List<LeaveRequest> findByPlacementIdOrderByStartDateAsc(UUID placementId);
    List<LeaveRequest> findByPlacementIdAndStartDateBetweenOrderByStartDateAsc(UUID placementId, LocalDate from, LocalDate to);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.placementId = :placementId " +
           "AND lr.status = 'APPROVED' " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    List<LeaveRequest> findApprovedOverlapping(
            @Param("placementId") UUID placementId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
