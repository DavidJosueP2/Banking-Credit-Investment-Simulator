package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.TipoCargo;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CargoCreditoResponseDto(
        Long id,
        Long productoId,
        String productoNombre,
        String nombre,
        TipoCargo tipoCargo,
        BigDecimal valor,
        Boolean obligatorio,
        String descripcion,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
