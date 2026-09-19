package com.edu.uta.backend.dto;

import java.time.OffsetDateTime;

public record InstitutionResponseDto(
        Long id,
        String nombre,
        String nombreComercial,
        String ruc,
        String logoUrl,
        String direccion,
        String telefono,
        String email,
        String sitioWeb,
        String ciudad,
        String provincia,
        String descripcion,
        String horarios,
        String colorPrimario,
        String colorSecundario,
        String infoLegal,
        String terminosCondiciones,
        String politicaPrivacidad,
        Boolean activo,
        OffsetDateTime actualizadoEn
) {}
