package com.helperhaven.chat;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.chat.dto.ConversationView;
import com.helperhaven.chat.dto.MessageView;
import com.helperhaven.chat.dto.OpenChatRequest;
import com.helperhaven.chat.dto.SendMessageRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Chat HTTP surface. The frontend polls {@code GET /api/chats/{id}/messages?since=...}
 * on a 3-second interval — Sprint A doesn't ship websockets — so the endpoints
 * are deliberately small and cheap.
 *
 * <p>All routes resolve the calling user from the JWT, never the request body, so
 * a malicious client can't impersonate someone else by lying about sender IDs.
 */
@RestController
@RequestMapping("/api/chats")
public class ChatController {

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }

    /** Sidebar list. Returns conversations newest-activity-first. */
    @GetMapping
    public List<ConversationView> list() {
        return chat.listForUser(JwtAuthFilter.currentUserId());
    }

    /**
     * Idempotent: open the conversation with {@code counterpartyUserId}, creating
     * it if absent. Frontend hits this when the user clicks "Unlock chat" on a
     * match detail page.
     */
    @PostMapping("/open")
    public ConversationView open(@Valid @RequestBody OpenChatRequest req) {
        return chat.openOrCreate(JwtAuthFilter.currentUserId(), req.counterpartyUserId());
    }

    @GetMapping("/{conversationId}")
    public ConversationView get(@PathVariable UUID conversationId) {
        return chat.get(JwtAuthFilter.currentUserId(), conversationId);
    }

    /**
     * Initial load passes no {@code since}; the polling loop passes the timestamp
     * of the last message it has, so the response only carries the delta.
     */
    @GetMapping("/{conversationId}/messages")
    public List<MessageView> messages(
            @PathVariable UUID conversationId,
            @RequestParam(required = false) Instant since
    ) {
        return chat.listMessages(JwtAuthFilter.currentUserId(), conversationId, since);
    }

    @PostMapping("/{conversationId}/messages")
    public MessageView send(
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest req
    ) {
        return chat.send(JwtAuthFilter.currentUserId(), conversationId, req.body());
    }

    @PostMapping("/{conversationId}/read")
    public void markRead(@PathVariable UUID conversationId) {
        chat.markRead(JwtAuthFilter.currentUserId(), conversationId);
    }
}
