package com.helperhaven.auth;

import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Reads {@code Authorization: Bearer <token>} on every request, validates the access
 * token, and populates the SecurityContext with a {@link UserPrincipal}.
 *
 * <p>Behaviour notes:
 * <ul>
 *   <li>Missing/malformed headers → continue the chain unauthenticated. Spring Security
 *       will reject the request later if the route requires auth.</li>
 *   <li>Invalid/expired tokens → also continue unauthenticated. The frontend handles 401
 *       by attempting a refresh; we don't want to short-circuit to 403 here.</li>
 * </ul>
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain
    ) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = header.substring(BEARER_PREFIX.length()).trim();
            authenticate(request, token);
        }
        chain.doFilter(request, response);
    }

    private void authenticate(HttpServletRequest request, String token) {
        try {
            JwtService.ParsedToken parsed = jwt.parseAccessToken(token);
            UserPrincipal principal = new UserPrincipal(
                    parsed.userId(),
                    safeRole(parsed.role()),
                    safeStatus(parsed.status())
            );
            UsernamePasswordAuthenticationToken authn =
                    new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
            authn.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authn);
        } catch (JwtService.InvalidTokenException ignored) {
            // Stay unauthenticated; downstream auth rules decide whether the request is allowed.
        }
    }

    private static UserRole safeRole(String s) {
        try { return UserRole.valueOf(s); } catch (Exception e) { return UserRole.EMPLOYER; }
    }

    private static UserStatus safeStatus(String s) {
        try { return UserStatus.valueOf(s); } catch (Exception e) { return UserStatus.PENDING_VERIFICATION; }
    }

    /**
     * Convenience accessor — pulls the authenticated principal off the SecurityContext
     * or throws if the request is unauthenticated. Use in controllers that have already
     * passed Spring Security's auth gate.
     */
    public static UUID currentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserPrincipal up) return up.id();
        throw new IllegalStateException("No authenticated UserPrincipal in SecurityContext");
    }
}
