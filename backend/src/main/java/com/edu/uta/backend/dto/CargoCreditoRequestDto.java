package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.TipoCargo;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CargoCreditoRequestDto(
        @NotNull Long productoId,
        @NotBlank @Size(max = 200) String nombre,
        @NotNull TipoCargo tipoCargo,
        @NotNull @DecimalMin("0.0") BigDecimal valor,
        Boolean obligatorio,
        String descripcion
) {}
