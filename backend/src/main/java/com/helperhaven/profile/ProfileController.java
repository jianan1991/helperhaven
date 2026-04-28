package com.helperhaven.profile;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.profile.dto.EmployerProfileRequest;
import com.helperhaven.profile.dto.EmployerProfileResponse;
import com.helperhaven.profile.dto.HelperProfileRequest;
import com.helperhaven.profile.dto.HelperProfileResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Helper and employer profile read/upsert endpoints. All routes here require a
 * valid access token (gated by SecurityConfig's {@code anyRequest().authenticated()}
 * fallthrough). The current user id is read from the SecurityContext rather than
 * accepted from the body so a HELPER can never write someone else's profile.
 */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profiles;

    public ProfileController(ProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/helper/me")
    public HelperProfileResponse getHelper() {
        return profiles.readHelper(JwtAuthFilter.currentUserId());
    }

    @PostMapping("/helper")
    public HelperProfileResponse saveHelper(@Valid @RequestBody HelperProfileRequest req) {
        return profiles.saveHelper(JwtAuthFilter.currentUserId(), req);
    }

    @GetMapping("/employer/me")
    public EmployerProfileResponse getEmployer() {
        return profiles.readEmployer(JwtAuthFilter.currentUserId());
    }

    @PostMapping("/employer")
    public EmployerProfileResponse saveEmployer(@Valid @RequestBody EmployerProfileRequest req) {
        return profiles.saveEmployer(JwtAuthFilter.currentUserId(), req);
    }
}
