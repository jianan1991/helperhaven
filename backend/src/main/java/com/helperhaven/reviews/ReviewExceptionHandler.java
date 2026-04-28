package com.helperhaven.reviews;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(basePackageClasses = ReviewController.class)
public class ReviewExceptionHandler {

    @ExceptionHandler(ReviewService.ReviewException.class)
    public ResponseEntity<Map<String, Object>> handle(ReviewService.ReviewException ex) {
        HttpStatus status = switch (ex.error()) {
            case USER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case NOT_HIRED -> HttpStatus.FORBIDDEN;
            case ALREADY_REVIEWED -> HttpStatus.CONFLICT;
            case WRONG_ROLES, SELF_REVIEW, BAD_BREAKDOWN, BAD_FLAG_TAG -> HttpStatus.BAD_REQUEST;
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("error", ex.error().name());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(status).body(body);
    }
}
