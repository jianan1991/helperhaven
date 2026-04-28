package com.helperhaven.profile;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Maps profile-domain exceptions to HTTP responses. Body shape mirrors
 * {@code AuthExceptionHandler} so the frontend's {@code asMessage()} helper
 * works without special-casing.
 */
@RestControllerAdvice(basePackageClasses = ProfileController.class)
public class ProfileExceptionHandler {

    @ExceptionHandler(ProfileService.ProfileException.class)
    public ResponseEntity<Map<String, Object>> handleProfile(ProfileService.ProfileException ex) {
        HttpStatus status = switch (ex.error()) {
            case NOT_FOUND, USER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case WRONG_ROLE -> HttpStatus.FORBIDDEN;
            case VECTOR_NOT_100 -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(body(ex.error().name(), ex.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() == null ? "Invalid value" : fe.getDefaultMessage(),
                        (a, b) -> a
                ));
        return ResponseEntity.badRequest().body(body("VALIDATION_FAILED", "Some fields need fixing", fields));
    }

    private static Map<String, Object> body(String error, String message, Map<String, String> fields) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("timestamp", Instant.now().toString());
        b.put("error", error);
        b.put("message", message);
        if (fields != null) b.put("fields", fields);
        return b;
    }
}
