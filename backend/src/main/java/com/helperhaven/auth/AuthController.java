package com.helperhaven.auth;

import com.helperhaven.auth.dto.AuthResponse;
import com.helperhaven.auth.dto.LoginRequest;
import com.helperhaven.auth.dto.MeResponse;
import com.helperhaven.auth.dto.RefreshRequest;
import com.helperhaven.auth.dto.SignupRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public auth surface. {@code /signup}, {@code /login}, {@code /refresh} are reachable
 * without a token (matched by SecurityConfig's {@code /api/auth/**} permit rule);
 * {@code /me} requires a valid access token and reads the user id from the
 * SecurityContext.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.signup(req));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    @GetMapping("/me")
    public MeResponse me() {
        return auth.me(JwtAuthFilter.currentUserId());
    }
}
