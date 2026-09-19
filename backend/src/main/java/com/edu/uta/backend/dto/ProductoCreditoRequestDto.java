package com.edu.uta.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductoCreditoRequestDto(
        @NotNull Long tipoCreditoId,
        @NotBlank @Size(max = 200) String nombre,
        String descripcion,
        @NotNull @DecimalMin("1") Integer plazoMinMeses,
        @NotNull @DecimalMin("1") Integer plazoMaxMeses,
        @NotNull BigDecimal montoMin,
        @NotNull BigDecimal montoMax,
        Boolean requiereGarante,
        String imagenUrl,
        Integer orden
) {}
