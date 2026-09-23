package com.edu.uta.backend.dto;

import java.time.OffsetDateTime;

public record SegmentoCreditoResponseDto(
        Long id,
        String codigo,
        String nombre,
        String descripcion,
        Integer orden,
        Boolean activo,
        OffsetDateTime creadoEn,
        OffsetDateTime actualizadoEn
) {}
