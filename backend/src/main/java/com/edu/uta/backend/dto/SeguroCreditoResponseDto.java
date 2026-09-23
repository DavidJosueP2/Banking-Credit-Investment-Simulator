package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.TipoSeguro;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SeguroCreditoResponseDto(
        Long id,
        Long productoId,
        String productoNombre,
        String nombre,
        TipoSeguro tipoSeguro,
        BigDecimal valorPorcentaje,
        Boolean obligatorio,
        String descripcion,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
