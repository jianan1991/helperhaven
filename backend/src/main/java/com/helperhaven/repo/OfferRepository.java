package com.helperhaven.repo;

import com.helperhaven.domain.Offer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OfferRepository extends JpaRepository<Offer, UUID> {
    List<Offer> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
}
