package com.helperhaven.wallet;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(basePackageClasses = WalletController.class)
public class WalletExceptionHandler {

    @ExceptionHandler(WalletService.WalletException.class)
    public ResponseEntity<Map<String, Object>> handle(WalletService.WalletException ex) {
        HttpStatus status = switch (ex.error()) {
            case NO_WALLET -> HttpStatus.NOT_FOUND;
            case INSUFFICIENT_FUNDS -> HttpStatus.PAYMENT_REQUIRED; // 402
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("error", ex.error().name());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(status).body(body);
    }
}
