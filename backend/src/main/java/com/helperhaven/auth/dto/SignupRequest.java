package com.helperhaven.auth.dto;

import com.helperhaven.domain.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Inbound payload for {@code POST /api/auth/signup}. Role is restricted to the
 * two self-service variants — admin and agency accounts are minted via separate
 * server-side flows.
 */
public record SignupRequest(
        @Email @NotBlank String email,
        @NotBlank
        @Size(min = 10, max = 200, message = "Password must be 10-200 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "Password must include lowercase, uppercase, and a number"
        )
        String password,
        @NotNull UserRole role,
        String locale
) {
    public UserRole roleOrDefault() {
        return role == null ? UserRole.EMPLOYER : role;
    }

    public String localeOrDefault() {
        return (locale == null || locale.isBlank()) ? "en" : locale;
    }
}
