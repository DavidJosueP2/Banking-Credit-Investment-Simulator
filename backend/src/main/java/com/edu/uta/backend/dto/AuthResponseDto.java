package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.RolUsuario;

public record AuthResponseDto(
        String token,
        String tipo,
        Long usuarioId,
        String nombre,
        String apellido,
        String email,
        RolUsuario rol
) {}
