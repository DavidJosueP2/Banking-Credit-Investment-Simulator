package com.edu.uta.backend.service;

import com.edu.uta.backend.config.JwtService;
import com.edu.uta.backend.domain.entity.UsuarioEntity;
import com.edu.uta.backend.domain.enums.RolUsuario;
import com.edu.uta.backend.dto.AuthResponseDto;
import com.edu.uta.backend.dto.LoginRequestDto;
import com.edu.uta.backend.dto.RegisterRequestDto;
import com.edu.uta.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponseDto login(LoginRequestDto dto) {
        UsuarioEntity usuario = usuarioRepository.findByEmailAndActivoTrue(dto.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciales incorrectas"));

        if (!passwordEncoder.matches(dto.password(), usuario.getPasswordHash())) {
            throw new BadCredentialsException("Credenciales incorrectas");
        }

        return buildResponse(usuario);
    }

    @Transactional
    public AuthResponseDto register(RegisterRequestDto dto) {
        if (usuarioRepository.existsByEmail(dto.email())) {
            throw new IllegalArgumentException("El correo electrónico ya está registrado");
        }

        UsuarioEntity usuario = new UsuarioEntity();
        usuario.setNombre(dto.nombre());
        usuario.setApellido(dto.apellido());
        usuario.setEmail(dto.email());
        usuario.setPasswordHash(passwordEncoder.encode(dto.password()));
        usuario.setCedula(dto.cedula());
        usuario.setTelefono(dto.telefono());
        usuario.setRol(RolUsuario.CLIENTE);

        usuario = usuarioRepository.save(usuario);
        return buildResponse(usuario);
    }

    private AuthResponseDto buildResponse(UsuarioEntity usuario) {
        String token = jwtService.generateToken(usuario);
        return new AuthResponseDto(
                token, "Bearer",
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getRol()
        );
    }
}
