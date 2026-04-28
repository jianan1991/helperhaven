package com.helperhaven.matches;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(basePackageClasses = MatchController.class)
public class MatchExceptionHandler {

    @ExceptionHandler(MatchService.MatchException.class)
    public ResponseEntity<Map<String, Object>> handle(MatchService.MatchException ex) {
        HttpStatus status = switch (ex.error()) {
            case USER_NOT_FOUND, PROFILE_NOT_READY -> HttpStatus.NOT_FOUND;
            case WRONG_ROLE -> HttpStatus.FORBIDDEN;
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("error", ex.error().name());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(status).body(body);
    }
}
