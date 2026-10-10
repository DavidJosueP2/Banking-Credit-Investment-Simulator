package com.edu.uta.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.DefaultCorsProcessor;
import static org.junit.jupiter.api.Assertions.*;

class CorsDeploymentTests {
    private MockHttpServletResponse preflight(String origin, String... profiles) throws Exception {
        var environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        var source = new SecurityConfig("https://app.example.com", environment).corsConfigurationSource();
        var request = new MockHttpServletRequest("OPTIONS", "/api/auth/login");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "content-type,x-csrf-token");
        var response = new MockHttpServletResponse();
        new DefaultCorsProcessor().processRequest(source.getCorsConfiguration(request), request, response);
        return response;
    }

    @Test void productionAllowsConfiguredFrontendWithCredentials() throws Exception {
        var response = preflight("https://app.example.com", "prod");
        assertEquals(200, response.getStatus());
        assertEquals("https://app.example.com", response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
    }

    @Test void productionRejectsOtherOriginsAndLocalhostEvenWithDevProfile() throws Exception {
        assertEquals(403, preflight("https://untrusted.example", "prod").getStatus());
        assertEquals(403, preflight("http://localhost:5173", "dev", "prod").getStatus());
    }

    @Test void developmentAllowsLocalPorts() throws Exception {
        assertEquals(200, preflight("http://localhost:5174", "dev").getStatus());
        assertEquals(200, preflight("http://127.0.0.1:5173", "dev").getStatus());
    }
}
