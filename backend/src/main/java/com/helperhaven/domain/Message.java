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
import java.util.UUID;

/**
 * One chat message inside a {@link Conversation}. We keep both the raw {@code body}
 * (what the user typed, retained for moderation/audit) and a {@code redactedBody}
 * (PII-stripped copy used pre-reveal). Sprint A doesn't redact anything yet — the
 * column exists so V3's schema is honoured and Sprint B can fill it in without a
 * migration.
 */
@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_user_id", nullable = false)
    private UUID senderUserId;

    @Column(nullable = false)
    private String body;

    @Column(name = "redacted_body")
    private String redactedBody;

    @Column(name = "has_redactions", nullable = false)
    private boolean hasRedactions;

    @Column(nullable = false)
    private boolean flagged;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    @Column(name = "read_at")
    private Instant readAt;
}
