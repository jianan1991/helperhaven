package com.helperhaven.domain;

import com.helperhaven.domain.enums.ConversationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * 1:1 conversation between two users (typically employer ↔ helper). We don't
 * model group chats — every row pairs exactly two user IDs, sorted so the
 * uniqueness index in V6 works symmetrically.
 *
 * <p>The {@code unlockRequestId} is nullable for Sprint A so we can demo chat
 * without the credit-decrement unlock flow. Sprint B will require it on every
 * new row.
 */
@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    private UUID id;

    @Column(name = "unlock_request_id")
    private UUID unlockRequestId;

    @Column(name = "user_a_id", nullable = false)
    private UUID userAId;

    @Column(name = "user_b_id", nullable = false)
    private UUID userBId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "conversation_status")
    private ConversationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "last_read_at_a")
    private Instant lastReadAtA;

    @Column(name = "last_read_at_b")
    private Instant lastReadAtB;
}
