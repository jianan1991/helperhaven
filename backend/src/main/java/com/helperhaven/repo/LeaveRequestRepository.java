package com.helperhaven.repo;

import com.helperhaven.domain.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    List<LeaveRequest> findByPlacementIdOrderByStartDateAsc(UUID placementId);
    List<LeaveRequest> findByPlacementIdAndStartDateBetweenOrderByStartDateAsc(UUID placementId, LocalDate from, LocalDate to);
}
