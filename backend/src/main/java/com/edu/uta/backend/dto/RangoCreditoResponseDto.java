package com.edu.uta.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RangoCreditoResponseDto(
        Long id,
        Long productoId,
        String productoNombre,
        Long tasaId,
        BigDecimal tasaValor,
        String tasaNombre,
        BigDecimal montoMin,
        BigDecimal montoMax,
        Integer plazoMinMeses,
        Integer plazoMaxMeses,
        String descripcion,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
