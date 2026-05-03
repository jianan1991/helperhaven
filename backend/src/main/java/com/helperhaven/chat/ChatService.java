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
import java.util.Map;
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
        Map<UUID, User> senderMap = buildSenderMap(rows);
        List<MessageView> out = new ArrayList<>(rows.size());
        for (Message m : rows) {
            if (!m.isFlagged()) out.add(toView(m, senderMap.get(m.getSenderUserId())));
        }
        return out;
    }

    private Map<UUID, User> buildSenderMap(List<Message> rows) {
        Map<UUID, User> map = new java.util.HashMap<>();
        rows.stream()
                .map(Message::getSenderUserId)
                .distinct()
                .forEach(id -> users.findById(id).ifPresent(u -> map.put(id, u)));
        return map;
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

        User sender = users.findById(userId).orElse(null);
        return toView(m, sender);
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
        User viewer = users.findById(viewerId).orElse(null);
        boolean viewerIsEmployer = viewer != null && viewer.getRole() == com.helperhaven.domain.enums.UserRole.EMPLOYER;
        Counterparty cp = lookupCounterparty(counterparty, viewerIsEmployer);
        Instant cursor = viewerId.equals(c.getUserAId()) ? c.getLastReadAtA() : c.getLastReadAtB();
        int unread = unreadCount(c.getId(), viewerId, cursor);
        String preview = previewFor(c.getId());
        return new ConversationView(
                c.getId(),
                counterparty,
                cp.displayName(),
                cp.photoUrl(),
                cp.contact(),
                c.getLastMessageAt(),
                preview,
                unread,
                c.getCreatedAt()
        );
    }

    private MessageView toView(Message m, User sender) {
        String role = sender != null ? sender.getRole().name() : null;
        String displayName = resolveDisplayName(sender);
        return new MessageView(
                m.getId(),
                m.getConversationId(),
                m.getSenderUserId(),
                role,
                displayName,
                m.getBody(),
                m.getSentAt(),
                m.getReadAt()
        );
    }

    private String resolveDisplayName(User sender) {
        if (sender == null) return null;
        return switch (sender.getRole()) {
            case HELPER -> helpers.findById(sender.getId())
                    .map(h -> h.getDisplayFirstName() != null ? h.getDisplayFirstName() : h.getFullName())
                    .orElse(null);
            case EMPLOYER -> employers.findById(sender.getId())
                    .map(com.helperhaven.domain.EmployerProfile::getFullName)
                    .orElse(null);
            case ADMIN -> "HelperHaven Admin";
            default -> null;
        };
    }

    /** Count messages in {@code conversationId} that aren't from {@code viewerId} and post-date their cursor. */
    private int unreadCount(UUID conversationId, UUID viewerId, Instant cursor) {
        // Cheap: V1's idx_messages_conv covers (conversation_id, sent_at).
        List<Message> rows = cursor == null
                ? messages.findByConversationIdOrderBySentAtAsc(conversationId)
                : messages.findSince(conversationId, cursor);
        int n = 0;
        for (Message m : rows) {
            if (!m.isFlagged() && !m.getSenderUserId().equals(viewerId)) n++;
        }
        return n;
    }

    private String previewFor(UUID conversationId) {
        List<Message> all = messages.findByConversationIdOrderBySentAtAsc(conversationId);
        for (int i = all.size() - 1; i >= 0; i--) {
            Message m = all.get(i);
            if (m.isFlagged()) continue;
            String body = m.getBody();
            if (body == null) continue;
            return body.length() <= PREVIEW_LEN ? body : body.substring(0, PREVIEW_LEN - 1) + "…";
        }
        return null;
    }

    /**
     * Resolve a user ID to display info.
     * When {@code revealContact} is true (viewer is employer) the helper's email is included.
     */
    private Counterparty lookupCounterparty(UUID userId, boolean revealContact) {
        User u = users.findById(userId).orElse(null);
        if (u == null) return new Counterparty("Unknown", null, null);

        switch (u.getRole()) {
            case HELPER -> {
                HelperProfile h = helpers.findById(userId).orElse(null);
                if (h != null) {
                    String contact = revealContact ? u.getEmail() : null;
                    return new Counterparty(
                            h.getDisplayFirstName() == null ? "Helper" : h.getDisplayFirstName(),
                            signedPhoto(h.getPhotoUrl()),
                            contact
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
                    return new Counterparty(name, null, null);
                }
            }
            default -> {
                // ADMIN / AGENCY shouldn't appear in chat in Sprint A, but fall through cleanly.
            }
        }
        return new Counterparty(u.getEmail() == null ? "Unknown" : u.getEmail(), null, null);
    }

    private String signedPhoto(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) return null;
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) return keyOrUrl;
        return storage.signedGetUrl(keyOrUrl, PHOTO_GET_TTL);
    }

    private record Counterparty(String displayName, String photoUrl, String contact) {}

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
