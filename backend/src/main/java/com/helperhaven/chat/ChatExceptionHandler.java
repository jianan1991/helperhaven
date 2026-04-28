package com.helperhaven.chat;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(basePackageClasses = ChatController.class)
public class ChatExceptionHandler {

    @ExceptionHandler(ChatService.ChatException.class)
    public ResponseEntity<Map<String, Object>> handle(ChatService.ChatException ex) {
        HttpStatus status = switch (ex.error()) {
            case NOT_FOUND, USER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case SELF_CHAT, EMPTY_BODY, CONVERSATION_CLOSED -> HttpStatus.BAD_REQUEST;
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("error", ex.error().name());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(status).body(body);
    }
}
