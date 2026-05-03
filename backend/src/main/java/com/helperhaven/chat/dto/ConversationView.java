package com.helperhaven.chat.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Hydrated conversation projection for the chat UI sidebar and the chat header.
 * {@code counterpartyDisplayName} / {@code counterpartyPhotoUrl} are computed
 * server-side so the UI doesn't have to join matches/profiles client-side.
 */
public record ConversationView(
        UUID id,
        UUID counterpartyUserId,
        String counterpartyDisplayName,
        String counterpartyPhotoUrl,
        /** Non-null only when the viewer is an employer — revealed as soon as they open the chat. */
        String counterpartyContact,
        Instant lastMessageAt,
        String lastMessagePreview,
        int unreadCount,
        Instant createdAt
) {}
