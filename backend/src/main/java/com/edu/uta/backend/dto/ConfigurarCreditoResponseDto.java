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
        OffsetDateTime creadoEn,
        String unidadPlazo,
        List<CargoResponseDto> cargosIndirectos
) {
    public ConfigurarCreditoResponseDto(
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
    ) {
        this(id, nombre, entidad, segmentoBce, montoMin, montoMax, plazoMinMeses, plazoMaxMeses,
                tasaInteres, tasaDesgravamenMensual, sistemasPermitidos, descripcion, activo, creadoEn, "MESES", List.of());
    }

    public record CargoResponseDto(
            Long id,
            String nombre,
            String tipoCargo,
            BigDecimal valor,
            String periodicidad,
            String baseCalculo,
            String normaAplicable,
            Boolean obligatorio
    ) {}
}
