package com.helperhaven.repo;

import com.helperhaven.domain.HelperInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface HelperInterestRepository extends JpaRepository<HelperInterest, HelperInterest.PK> {

    /** Active = expressed within the TTL window. */
    boolean existsByHelperIdAndEmployerIdAndExpressedAtAfter(UUID helperId, UUID employerId, Instant cutoff);

    /** Number of active interests a helper currently holds (within TTL). */
    @Query("SELECT COUNT(i) FROM HelperInterest i WHERE i.helperId = :helperId AND i.expressedAt > :cutoff")
    long countActiveByHelperId(@Param("helperId") UUID helperId, @Param("cutoff") Instant cutoff);

    /** All active interest records for a helper — carries expressedAt for expiry display. */
    List<HelperInterest> findByHelperIdAndExpressedAtAfter(UUID helperId, Instant cutoff);

    /** All active interest records targeting an employer — carries expressedAt for expiry display. */
    List<HelperInterest> findByEmployerIdAndExpressedAtAfter(UUID employerId, Instant cutoff);

    void deleteByHelperIdAndEmployerId(UUID helperId, UUID employerId);
}
