package com.edu.uta.backend.controller;

import com.edu.uta.backend.domain.entity.UsuarioEntity;
import com.edu.uta.backend.dto.AuthResponseDto;
import com.edu.uta.backend.dto.LoginRequestDto;
import com.edu.uta.backend.dto.RegisterRequestDto;
import com.edu.uta.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto dto) {
        return ResponseEntity.ok(authService.login(dto));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(dto));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UsuarioEntity usuario) {
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of(
                "id",       usuario.getId(),
                "nombre",   usuario.getNombre(),
                "apellido", usuario.getApellido(),
                "email",    usuario.getEmail(),
                "rol",      usuario.getRol()
        ));
    }
}
