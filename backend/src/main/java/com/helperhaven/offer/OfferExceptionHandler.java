package com.helperhaven.offer;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class OfferExceptionHandler {

    @ExceptionHandler(OfferService.OfferException.class)
    public ResponseEntity<Map<String, String>> handle(OfferService.OfferException ex) {
        HttpStatus status = switch (ex.error()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case EXPIRED -> HttpStatus.GONE;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status)
                .body(Map.of("error", ex.error().name(), "message", ex.getMessage()));
    }
}
