package com.helperhaven.repo;

import com.helperhaven.domain.HelperProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface HelperProfileRepository extends JpaRepository<HelperProfile, UUID> {

    /**
     * Helpers with all five score dimensions filled in — i.e. they finished
     * the onboarding wizard's 5-vector step. Used by the matching endpoint
     * so we never recommend a half-completed profile.
     */
    @Query("""
            select h from HelperProfile h
            where h.scoreInfant   is not null
              and h.scoreElderly  is not null
              and h.scoreCooking  is not null
              and h.scoreHouse    is not null
              and h.scoreAttitude is not null
            """)
    List<HelperProfile> findAllScored();
}
