package com.helperhaven.auth;

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
 * Maps auth-domain exceptions to clean HTTP responses. The body shape
 * ({@code message}, {@code error}, optional {@code fields}) matches what
 * the React {@code asMessage()} helper already understands.
 */
@RestControllerAdvice(basePackageClasses = AuthController.class)
public class AuthExceptionHandler {

    @ExceptionHandler(AuthService.AuthException.class)
    public ResponseEntity<Map<String, Object>> handleAuth(AuthService.AuthException ex) {
        HttpStatus status = switch (ex.error()) {
            case EMAIL_TAKEN -> HttpStatus.CONFLICT;
            case INVALID_CREDENTIALS -> HttpStatus.UNAUTHORIZED;
            case INVALID_TOKEN -> HttpStatus.UNAUTHORIZED;
            case INVALID_ROLE -> HttpStatus.BAD_REQUEST;
            case ACCOUNT_BANNED, ACCOUNT_SUSPENDED -> HttpStatus.FORBIDDEN;
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
