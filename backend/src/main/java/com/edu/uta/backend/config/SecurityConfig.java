package com.edu.uta.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final String frontendUrl;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          @Value("${app.cors.allowed-origin:http://localhost:5173}") String frontendUrl) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.frontendUrl   = frontendUrl;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Permitir peticiones preflight CORS (OPTIONS)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Endpoints públicos del simulador y autenticación
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/simulador/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/creditos/simular/**").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/creditos/**").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/institucion/**").permitAll()
                // Configuración y administración de créditos — solo ADMIN o ASESOR
                .requestMatchers(HttpMethod.PUT,    "/api/institucion/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH,  "/api/institucion/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/creditos/**").hasAnyRole("ADMIN", "ASESOR")
                .requestMatchers(HttpMethod.PUT,    "/api/creditos/**").hasAnyRole("ADMIN", "ASESOR")
                .requestMatchers(HttpMethod.PATCH,  "/api/creditos/**").hasAnyRole("ADMIN", "ASESOR")
                .requestMatchers(HttpMethod.DELETE, "/api/creditos/**").hasAnyRole("ADMIN", "ASESOR")
                // Todo lo demás requiere autenticación
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Habilitar de forma global http://localhost:5173
        configuration.setAllowedOrigins(List.of("http://localhost:5173", frontendUrl));
        configuration.setAllowedMethods(List.of("GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
