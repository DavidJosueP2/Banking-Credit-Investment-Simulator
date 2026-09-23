package com.edu.uta.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RangoCreditoRequestDto(
        @NotNull Long productoId,
        Long tasaId,
        @NotNull @DecimalMin("0.01") BigDecimal montoMin,
        @NotNull @DecimalMin("0.01") BigDecimal montoMax,
        @NotNull Integer plazoMinMeses,
        @NotNull Integer plazoMaxMeses,
        String descripcion
) {}
