package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record ConfigurarCreditoResponseDto(
        Long id,
        String nombre,
        String entidad,
        String segmentoBce,
        BigDecimal montoMin,
        BigDecimal montoMax,
        Integer plazoMinMeses,
        Integer plazoMaxMeses,
        BigDecimal tasaInteres,
        BigDecimal tasaDesgravamenMensual,
        List<SistemaAmortizacion> sistemasPermitidos,
        String descripcion,
        Boolean activo,
        OffsetDateTime creadoEn
) {}
