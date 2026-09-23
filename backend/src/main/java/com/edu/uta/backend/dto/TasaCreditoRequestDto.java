package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.TipoTasa;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TasaCreditoRequestDto(
        Long productoId,
        Long fuenteId,
        @NotNull TipoTasa tipoTasa,
        @Size(max = 200) String nombre,
        @NotNull @DecimalMin("0.0001") BigDecimal valor,
        LocalDate fechaVigencia,
        LocalDate fechaFin,
        String segmentoBce,
        String institucionRef,
        String observacion,
        String urlFuente
) {}
