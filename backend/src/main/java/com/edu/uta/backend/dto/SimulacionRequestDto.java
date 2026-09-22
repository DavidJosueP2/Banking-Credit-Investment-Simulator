package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SimulacionRequestDto(
        Long productoId,
        @NotNull @DecimalMin("100.00") BigDecimal monto,
        @NotNull Integer plazoMeses,
        @NotNull BigDecimal tasaEfectiva,     // porcentaje anual, ej: 15.74
        @NotNull SistemaAmortizacion sistema, // FRANCES o ALEMAN
        String tipoTasaUsada,                 // para auditoría
        Boolean incluirCargos,
        Boolean incluirSeguros,
        /** Tasa anual del seguro de desgravamen en porcentaje, ej: 0.0699 */
        BigDecimal seguroDesgravamenPct,
        /** Fecha de desembolso en formato ISO-8601 (yyyy-MM-dd), ej: "2025-10-01" */
        String fechaDesembolso,
        /** Segmento BCE para auditoría, ej: "CONSUMO", "VIVIENDA", "MICROCREDITO", "PYMES" */
        String segmentoBce,
        /** Entidad solicitada para validar aislamiento, ej: "BANCO" o "COOPERATIVA" */
        String entidad
) {}
