package com.edu.uta.backend.dto;

import java.time.OffsetDateTime;

public record TipoCreditoResponseDto(
        Long id,
        Long segmentoId,
        String segmentoNombre,
        String segmentoCodigo,
        String nombre,
        String descripcion,
        Integer orden,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
