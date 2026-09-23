package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.TipoTasa;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record TasaCreditoResponseDto(
        Long id,
        Long productoId,
        String productoNombre,
        Long fuenteId,
        String fuenteNombre,
        String fuenteCodigo,
        TipoTasa tipoTasa,
        String nombre,
        BigDecimal valor,
        LocalDate fechaVigencia,
        LocalDate fechaFin,
        String segmentoBce,
        String institucionRef,
        String observacion,
        String urlFuente,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
