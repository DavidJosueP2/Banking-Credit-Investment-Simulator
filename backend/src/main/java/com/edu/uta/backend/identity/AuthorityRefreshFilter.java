package com.edu.uta.backend.identity;

import java.io.IOException;

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

/** Recheck persisted authorities so role revocation does not wait for session expiry. */
public class AuthorityRefreshFilter extends OncePerRequestFilter {

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
}
