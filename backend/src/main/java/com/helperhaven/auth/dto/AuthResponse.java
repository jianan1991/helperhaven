package com.helperhaven.auth.dto;

/**
 * Returned from signup, login, and refresh. Mirrors the shape the React
 * {@code useAuthStore} expects ({@code accessToken}, {@code refreshToken}, {@code user}).
 */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        MeResponse user
) {}
