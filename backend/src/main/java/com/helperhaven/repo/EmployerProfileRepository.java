package com.helperhaven.repo;

import com.helperhaven.domain.EmployerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EmployerProfileRepository extends JpaRepository<EmployerProfile, UUID> {
}
