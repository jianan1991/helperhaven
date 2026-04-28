package com.helperhaven.permits;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(basePackageClasses = PermitController.class)
public class PermitExceptionHandler {

    @ExceptionHandler(PermitService.PermitException.class)
    public ResponseEntity<Map<String, Object>> handle(PermitService.PermitException ex) {
        HttpStatus status = switch (ex.error()) {
            case USER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case WRONG_ROLE -> HttpStatus.BAD_REQUEST;
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("error", ex.error().name());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(status).body(body);
    }
}
