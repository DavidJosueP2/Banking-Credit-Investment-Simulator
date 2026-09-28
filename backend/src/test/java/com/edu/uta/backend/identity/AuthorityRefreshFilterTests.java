package com.edu.uta.backend.identity;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

/** Tras un cambio de contraseña, las sesiones abiertas con la contraseña anterior se cierran. */
class AuthorityRefreshFilterTests {

    private final IdentityService identity = mock(IdentityService.class);
    private final AuthorityRefreshFilter filter = new AuthorityRefreshFilter(identity);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static UserDetails user(String hash) {
        return User.withUsername("cliente").password(hash).authorities("own.requests.read").build();
    }

    private MockHttpServletRequest signedIn(MockHttpSession session, String hash) {
        UserDetails current = user(hash);
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(current, null, current.getAuthorities()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(session);
        return request;
    }

    @Test
    void keepsSessionWhilePasswordIsTheSame() throws Exception {
        MockHttpSession session = new MockHttpSession();
        AuthorityRefreshFilter.rememberCredential(session, "hash-1");
        when(identity.loadUserByUsername("cliente")).thenReturn(user("hash-1"));

        filter.doFilter(signedIn(session, "hash-1"), new MockHttpServletResponse(), new MockFilterChain());

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void closesSessionOpenedWithOldPassword() throws Exception {
        MockHttpSession session = new MockHttpSession();
        AuthorityRefreshFilter.rememberCredential(session, "hash-1");
        when(identity.loadUserByUsername("cliente")).thenReturn(user("hash-2"));

        filter.doFilter(signedIn(session, "hash-1"), new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(session.isInvalid());
    }

    @Test
    void closesLegacySessionWithoutStampAfterPasswordChange() throws Exception {
        MockHttpSession session = new MockHttpSession();
        when(identity.loadUserByUsername("cliente")).thenReturn(user("hash-2"));

        filter.doFilter(signedIn(session, "hash-1"), new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(session.isInvalid());
    }

    @Test
    void keepsLegacySessionWithUnchangedPassword() throws Exception {
        MockHttpSession session = new MockHttpSession();
        when(identity.loadUserByUsername("cliente")).thenReturn(user("hash-1"));

        filter.doFilter(signedIn(session, "hash-1"), new MockHttpServletResponse(), new MockFilterChain());

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(session.getAttribute("brunexa.credential-stamp"));
    }

    @Test
    void keepsSessionThatUpdatedItsOwnCredential() throws Exception {
        MockHttpSession session = new MockHttpSession();
        AuthorityRefreshFilter.rememberCredential(session, "hash-1");
        AuthorityRefreshFilter.rememberCredential(session, "hash-2");
        when(identity.loadUserByUsername("cliente")).thenReturn(user("hash-2"));

        filter.doFilter(signedIn(session, "hash-1"), new MockHttpServletResponse(), new MockFilterChain());

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertFalse(session.isInvalid());
    }
}
