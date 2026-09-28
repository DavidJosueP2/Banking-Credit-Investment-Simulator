package com.edu.uta.backend.identity;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Recheck persisted authorities so role revocation does not wait for session expiry. Also closes every
 * other session after a password change: each session keeps a fingerprint of the password hash it was
 * opened with, and a session whose fingerprint no longer matches is invalidated.
 */
public class AuthorityRefreshFilter extends OncePerRequestFilter {

    private static final String CREDENTIAL_STAMP = "brunexa.credential-stamp";

    private final IdentityService identity;

    public AuthorityRefreshFilter(IdentityService identity) {
        this.identity = identity;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Authentication current = SecurityContextHolder.getContext().getAuthentication();
        if (current != null && current.isAuthenticated() && current.getPrincipal() instanceof UserDetails) {
            try {
                UserDetails fresh = identity.loadUserByUsername(current.getName());
                if (!fresh.isEnabled() || !fresh.isAccountNonLocked()) {
                    SecurityContextHolder.clearContext();
                } else if (credentialChanged(request.getSession(false),
                        ((UserDetails) current.getPrincipal()).getPassword(), fresh.getPassword())) {
                    request.getSession(false).invalidate();
                    SecurityContextHolder.clearContext();
                } else {
                    var updated = UsernamePasswordAuthenticationToken.authenticated(
                            fresh, current.getCredentials(), fresh.getAuthorities());
                    updated.setDetails(current.getDetails());
                    SecurityContextHolder.getContext().setAuthentication(updated);
                }
            } catch (UsernameNotFoundException exception) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    /** Remembers the credential this session belongs to (login and the session that changed the password). */
    public static void rememberCredential(HttpSession session, String passwordHash) {
        if (session != null && passwordHash != null) session.setAttribute(CREDENTIAL_STAMP, stamp(passwordHash));
    }

    private static boolean credentialChanged(HttpSession session, String previousHash, String passwordHash) {
        if (session == null || passwordHash == null) return false;
        Object known = session.getAttribute(CREDENTIAL_STAMP);
        if (known == null) {
            // Sessions opened before this check was deployed still carry their login credential
            // in the persisted principal. Do not silently adopt a newer password for them.
            if (previousHash != null && !previousHash.equals(passwordHash)) return true;
            rememberCredential(session, passwordHash);
            return false;
        }
        return !known.equals(stamp(passwordHash));
    }

    /** SHA-256 of the stored hash: the session never keeps the hash itself. */
    static String stamp(String passwordHash) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(passwordHash.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
