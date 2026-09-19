package com.edu.uta.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProductoCreditoResponseDto(
        Long id,
        Long tipoCreditoId,
        String tipoCreditoNombre,
        Long segmentoId,
        String segmentoNombre,
        String nombre,
        String descripcion,
        Integer plazoMinMeses,
        Integer plazoMaxMeses,
        BigDecimal montoMin,
        BigDecimal montoMax,
        Boolean requiereGarante,
        String imagenUrl,
        Integer orden,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
