package com.helperhaven.chat;

import com.helperhaven.chat.dto.ConversationView;
import com.helperhaven.chat.dto.MessageView;
import com.helperhaven.domain.Conversation;
import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.Message;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.ConversationStatus;
import com.helperhaven.repo.ConversationRepository;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.MessageRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Sprint A chat service. The contract is intentionally minimal: open or fetch
 * the unique 1:1 conversation between two users, list its messages, append a
 * message, and let either side mark messages as read. Polling is implemented
 * as "give me everything since timestamp X" — no websockets in Sprint A.
 *
 * <p>Authorisation: every method that takes a {@code conversationId} verifies
 * the requesting user is one of the two participants. We never trust the
 * client to scope correctly.
 *
 * <p>Sprint B will: enforce unlock-before-chat (NOT NULL on unlockRequestId),
 * add PII redaction, drive expiry, and switch the unread cursor to push.
 */
@Service
public class ChatService {

    private static final Duration PHOTO_GET_TTL = Duration.ofHours(1);
    private static final int PREVIEW_LEN = 80;

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final UserRepository users;
    private final HelperProfileRepository helpers;
    private final EmployerProfileRepository employers;
    private final FileStorage storage;

    public ChatService(
            ConversationRepository conversations,
            MessageRepository messages,
            UserRepository users,
            HelperProfileRepository helpers,
            EmployerProfileRepository employers,
            FileStorage storage
    ) {
        this.conversations = conversations;
        this.messages = messages;
        this.users = users;
        this.helpers = helpers;
        this.employers = employers;
        this.storage = storage;
    }

    // ---------------------------------------------------------------- open / fetch

    /**
     * Find or create the conversation between {@code currentUserId} and
     * {@code counterpartyUserId}. Idempotent — calling twice returns the same
     * row. Sprint B will require an active unlock_request before this succeeds.
     */
    @Transactional
    public ConversationView openOrCreate(UUID currentUserId, UUID counterpartyUserId) {
        if (currentUserId.equals(counterpartyUserId)) {
            throw new ChatException(ChatError.SELF_CHAT, "You can't chat with yourself");
        }
        users.findById(currentUserId)
                .orElseThrow(() -> new ChatException(ChatError.USER_NOT_FOUND, "Account not found"));
        users.findById(counterpartyUserId)
                .orElseThrow(() -> new ChatException(ChatError.USER_NOT_FOUND, "That user no longer exists"));

        Conversation c = conversations
                .findOpenBetween(currentUserId, counterpartyUserId, ConversationStatus.OPEN)
                .orElseGet(() -> createConversation(currentUserId, counterpartyUserId));

        return view(c, currentUserId);
    }

    private Conversation createConversation(UUID a, UUID b) {
        Instant now = Instant.now();
        // Sort the IDs so user_a_id < user_b_id — keeps the symmetric uniqueness
        // index honest and means "user_a vs user_b" carries no semantic meaning.
        UUID lo = a.compareTo(b) <= 0 ? a : b;
        UUID hi = a.compareTo(b) <= 0 ? b : a;
        Conversation c = Conversation.builder()
                .id(UUID.randomUUID())
                .unlockRequestId(null) // Sprint A: no unlock yet
                .userAId(lo)
                .userBId(hi)
                .status(ConversationStatus.OPEN)
                .createdAt(now)
                .build();
        return conversations.save(c);
    }

    // ---------------------------------------------------------------- list

    @Transactional(readOnly = true)
    public List<ConversationView> listForUser(UUID userId) {
        users.findById(userId)
                .orElseThrow(() -> new ChatException(ChatError.USER_NOT_FOUND, "Account not found"));
        return conversations.findAllForUser(userId).stream()
                .map(c -> view(c, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public ConversationView get(UUID userId, UUID conversationId) {
        Conversation c = requireParticipant(userId, conversationId);
        return view(c, userId);
    }

    // ---------------------------------------------------------------- messages

    @Transactional(readOnly = true)
    public List<MessageView> listMessages(UUID userId, UUID conversationId, Instant since) {
        requireParticipant(userId, conversationId);
        List<Message> rows = since == null
                ? messages.findByConversationIdOrderBySentAtAsc(conversationId)
                : messages.findSince(conversationId, since);
        List<MessageView> out = new ArrayList<>(rows.size());
        for (Message m : rows) out.add(toView(m));
        return out;
    }

    @Transactional
    public MessageView send(UUID userId, UUID conversationId, String body) {
        Conversation c = requireParticipant(userId, conversationId);
        if (c.getStatus() == ConversationStatus.CLOSED) {
            throw new ChatException(ChatError.CONVERSATION_CLOSED, "This conversation is closed");
        }
        String trimmed = body == null ? "" : body.strip();
        if (trimmed.isEmpty()) {
            throw new ChatException(ChatError.EMPTY_BODY, "Message body cannot be empty");
        }

        Instant now = Instant.now();
        Message m = Message.builder()
                .id(UUID.randomUUID())
                .conversationId(conversationId)
                .senderUserId(userId)
                .body(trimmed)
                .redactedBody(null) // Sprint A: no redaction yet
                .hasRedactions(false)
                .flagged(false)
                .sentAt(now)
                .build();
        messages.save(m);

        c.setLastMessageAt(now);
        // The sender has obviously seen their own message — bump their cursor too.
        if (userId.equals(c.getUserAId())) c.setLastReadAtA(now);
        else c.setLastReadAtB(now);

        return toView(m);
    }

    /**
     * Mark the conversation as read for the calling user. The cursor on the
     * conversation row is what {@link #unreadCount} keys off.
     */
    @Transactional
    public void markRead(UUID userId, UUID conversationId) {
        Conversation c = requireParticipant(userId, conversationId);
        Instant now = Instant.now();
        if (userId.equals(c.getUserAId())) c.setLastReadAtA(now);
        else c.setLastReadAtB(now);
    }

    // ---------------------------------------------------------------- helpers

    private Conversation requireParticipant(UUID userId, UUID conversationId) {
        Conversation c = conversations.findById(conversationId)
                .orElseThrow(() -> new ChatException(ChatError.NOT_FOUND, "Conversation not found"));
        if (!userId.equals(c.getUserAId()) && !userId.equals(c.getUserBId())) {
            throw new ChatException(ChatError.FORBIDDEN, "You can't access this conversation");
        }
        return c;
    }

    private ConversationView view(Conversation c, UUID viewerId) {
        UUID counterparty = viewerId.equals(c.getUserAId()) ? c.getUserBId() : c.getUserAId();
        Counterparty cp = lookupCounterparty(counterparty);
        Instant cursor = viewerId.equals(c.getUserAId()) ? c.getLastReadAtA() : c.getLastReadAtB();
        int unread = unreadCount(c.getId(), viewerId, cursor);
        String preview = previewFor(c.getId());
        return new ConversationView(
                c.getId(),
                counterparty,
                cp.displayName(),
                cp.photoUrl(),
                c.getLastMessageAt(),
                preview,
                unread,
                c.getCreatedAt()
        );
    }

    private MessageView toView(Message m) {
        return new MessageView(
                m.getId(),
                m.getConversationId(),
                m.getSenderUserId(),
                m.getBody(),
                m.getSentAt(),
                m.getReadAt()
        );
    }

    /** Count messages in {@code conversationId} that aren't from {@code viewerId} and post-date their cursor. */
    private int unreadCount(UUID conversationId, UUID viewerId, Instant cursor) {
        // Cheap: V1's idx_messages_conv covers (conversation_id, sent_at).
        List<Message> rows = cursor == null
                ? messages.findByConversationIdOrderBySentAtAsc(conversationId)
                : messages.findSince(conversationId, cursor);
        int n = 0;
        for (Message m : rows) {
            if (!m.getSenderUserId().equals(viewerId)) n++;
        }
        return n;
    }

    private String previewFor(UUID conversationId) {
        // Sprint A: scan the in-order list and take the last one. We only do this
        // for the sidebar list endpoint; the per-conversation views don't need it.
        List<Message> all = messages.findByConversationIdOrderBySentAtAsc(conversationId);
        if (all.isEmpty()) return null;
        String body = all.get(all.size() - 1).getBody();
        if (body == null) return null;
        return body.length() <= PREVIEW_LEN ? body : body.substring(0, PREVIEW_LEN - 1) + "…";
    }

    /** Resolve a user ID to {displayName, photoUrl} without exposing whole profile DTOs. */
    private Counterparty lookupCounterparty(UUID userId) {
        User u = users.findById(userId).orElse(null);
        if (u == null) return new Counterparty("Unknown", null);

        switch (u.getRole()) {
            case HELPER -> {
                HelperProfile h = helpers.findById(userId).orElse(null);
                if (h != null) {
                    return new Counterparty(
                            h.getDisplayFirstName() == null ? "Helper" : h.getDisplayFirstName(),
                            signedPhoto(h.getPhotoUrl())
                    );
                }
            }
            case EMPLOYER -> {
                EmployerProfile e = employers.findById(userId).orElse(null);
                if (e != null) {
                    String name = e.getFullName();
                    if (name == null || name.isBlank()) {
                        name = "Family in " + (e.getDistrict() == null ? "SG" : e.getDistrict());
                    }
                    return new Counterparty(name, null);
                }
            }
            default -> {
                // ADMIN / AGENCY shouldn't appear in chat in Sprint A, but fall through cleanly.
            }
        }
        return new Counterparty(u.getEmail() == null ? "Unknown" : u.getEmail(), null);
    }

    private String signedPhoto(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) return null;
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) return keyOrUrl;
        return storage.signedGetUrl(keyOrUrl, PHOTO_GET_TTL);
    }

    private record Counterparty(String displayName, String photoUrl) {}

    // ---------------------------------------------------------------- errors

    public enum ChatError {
        NOT_FOUND,
        FORBIDDEN,
        USER_NOT_FOUND,
        SELF_CHAT,
        EMPTY_BODY,
        CONVERSATION_CLOSED
    }

    public static class ChatException extends RuntimeException {
        private final ChatError error;
        public ChatException(ChatError error, String message) {
            super(message);
            this.error = error;
        }
        public ChatError error() { return error; }
    }
}
