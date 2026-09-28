package com.edu.uta.backend.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class AccountSecurityNotifierTests {

    @Test
    void describesCommonBrowsers() {
        assertEquals("Chrome en Windows", AccountSecurityNotifier.device(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"));
        assertEquals("Edge en Windows", AccountSecurityNotifier.device(
                "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0"));
        assertEquals("Firefox en Linux", AccountSecurityNotifier.device(
                "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0"));
        assertEquals("Safari en iOS", AccountSecurityNotifier.device(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1"));
        assertEquals("Desconocido", AccountSecurityNotifier.device(null));
    }

    @Test
    void prefersForwardedClientIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        assertEquals("10.0.0.5", AccountSecurityNotifier.clientIp(request));
        request.addHeader("X-Forwarded-For", "181.39.1.20, 10.0.0.1");
        assertEquals("181.39.1.20", AccountSecurityNotifier.clientIp(request));
    }
}
