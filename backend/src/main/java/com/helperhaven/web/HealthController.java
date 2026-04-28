package com.helperhaven.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/hello")
    public Map<String, Object> hello() {
        return Map.of(
                "app", "helperhaven-backend",
                "status", "ok",
                "now", Instant.now().toString()
        );
    }
}
