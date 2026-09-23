package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;

import java.math.BigDecimal;
import java.util.List;

public record ProductoSimuladorDto(
        Long id,
        String nombre,
        String descripcion,
        BigDecimal tasaNominal,
        BigDecimal desgravamen,
        BigDecimal montoMin,
        BigDecimal montoMax,
        Integer plazoMin,
        Integer plazoMax,
        String unidadPlazo, // "MESES" o "ANIOS"
        List<SistemaAmortizacion> sistemasPermitidos,
        String segmentoBce,
        List<CargoIndirectoDto> cargosIndirectos
) {
    public record CargoIndirectoDto(
            Long id,
            String nombre,
            String tipoCargo,    // FIJO o PORCENTAJE
            BigDecimal valor,
            String periodicidad, // MENSUAL o UNICO
            String baseCalculo,  // SALDO_DEUDOR, MONTO_SOLICITADO, FIJO
            String normaAplicable,
            Boolean obligatorio
    ) {}
}
