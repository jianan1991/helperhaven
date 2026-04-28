package com.helperhaven.repo;

import com.helperhaven.domain.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    /** All messages for a conversation, oldest first. Used on initial load. */
    List<Message> findByConversationIdOrderBySentAtAsc(UUID conversationId);

    /** Polling: messages strictly newer than {@code since}. */
    @Query("""
        SELECT m FROM Message m
        WHERE m.conversationId = :conversationId
          AND m.sentAt > :since
        ORDER BY m.sentAt ASC
        """)
    List<Message> findSince(
            @Param("conversationId") UUID conversationId,
            @Param("since") Instant since
    );
}
