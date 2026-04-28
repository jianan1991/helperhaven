package com.helperhaven.repo;

import com.helperhaven.domain.Conversation;
import com.helperhaven.domain.enums.ConversationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /**
     * Find the open conversation between two users in either direction.
     * Mirrors the symmetric uniqueness index in V6.
     */
    @Query("""
        SELECT c FROM Conversation c
        WHERE c.status = :status
          AND ((c.userAId = :a AND c.userBId = :b)
            OR (c.userAId = :b AND c.userBId = :a))
        """)
    Optional<Conversation> findOpenBetween(
            @Param("a") UUID a,
            @Param("b") UUID b,
            @Param("status") ConversationStatus status
    );

    @Query("""
        SELECT c FROM Conversation c
        WHERE c.userAId = :userId OR c.userBId = :userId
        ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC
        """)
    List<Conversation> findAllForUser(@Param("userId") UUID userId);
}
