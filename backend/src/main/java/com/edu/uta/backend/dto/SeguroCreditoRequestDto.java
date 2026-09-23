package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.TipoSeguro;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SeguroCreditoRequestDto(
        @NotNull Long productoId,
        @NotBlank @Size(max = 200) String nombre,
        @NotNull TipoSeguro tipoSeguro,
        @NotNull @DecimalMin("0.0") BigDecimal valorPorcentaje,
        Boolean obligatorio,
        String descripcion
) {}
