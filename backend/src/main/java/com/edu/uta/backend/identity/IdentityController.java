package com.edu.uta.backend.identity;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api")
public class IdentityController {

    private final IdentityService identity;

    public IdentityController(IdentityService identity) {
        this.identity = identity;
    }

    public record CreateUser(@NotBlank @Size(min = 4, max = 30) String username,
                             @NotBlank @Email String email,
                             @NotBlank @Size(max = 120) String fullName,
                             @NotBlank @Size(min = 12) String password,
                             @Size(min = 1) List<String> roles) {}

    public record AssignRoles(@Size(min = 1) List<String> roles) {}

    @GetMapping("/auth/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @GetMapping("/auth/me")
    public IdentityService.Account me(Authentication authentication) {
        return identity.accountByUsername(authentication.getName());
    }

    @GetMapping("/admin/roles")
    @PreAuthorize("hasAuthority('users.roles.manage')")
    public List<IdentityService.Role> roles() {
        return identity.roles();
    }

    @GetMapping("/admin/permissions")
    @PreAuthorize("hasAuthority('users.roles.manage')")
    public List<IdentityService.Permission> permissions() {
        return identity.permissions();
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAuthority('users.roles.manage')")
    public List<IdentityService.Account> users() {
        return identity.accounts();
    }

    @PostMapping("/admin/users")
    @PreAuthorize("hasAuthority('users.roles.manage')")
    public ResponseEntity<IdentityService.Account> createUser(@Valid @RequestBody CreateUser request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(identity.createAccount(
                request.username(), request.email(), request.fullName(), request.password(), request.roles()));
    }

    @PutMapping("/admin/users/{id}/roles")
    @PreAuthorize("hasAuthority('users.roles.manage')")
    public IdentityService.Account assignRoles(@PathVariable long id, @Valid @RequestBody AssignRoles request,
                                                Authentication authentication) {
        return identity.replaceRoles(id, request.roles(), authentication.getName());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "El correo o el usuario ya están registrados"));
    }
}
