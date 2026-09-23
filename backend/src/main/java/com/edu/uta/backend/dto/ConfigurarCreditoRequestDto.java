package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record ConfigurarCreditoRequestDto(
        @NotBlank(message = "El nombre del crédito es obligatorio")
        String nombre,

        @NotBlank(message = "La entidad (Banco/Cooperativa) es obligatoria")
        String entidad,

        @NotBlank(message = "El segmento regulatorio BCE es obligatorio")
        String segmentoBce,

        @NotNull(message = "El monto mínimo es obligatorio")
        @DecimalMin(value = "50.00", message = "El monto mínimo no puede ser inferior a $50")
        BigDecimal montoMin,

        @NotNull(message = "El monto máximo es obligatorio")
        @DecimalMin(value = "50.00", message = "El monto máximo no puede ser inferior a $50")
        BigDecimal montoMax,

        @NotNull(message = "El plazo mínimo es obligatorio")
        Integer plazoMinMeses,

        @NotNull(message = "El plazo máximo es obligatorio")
        Integer plazoMaxMeses,

        @NotNull(message = "La tasa de interés es obligatoria")
        @DecimalMin(value = "0.01", message = "La tasa de interés debe ser mayor a 0")
        BigDecimal tasaInteres,

        @NotNull(message = "La tasa de seguro de desgravamen mensual es obligatoria")
        @DecimalMin(value = "0.0000", message = "El desgravamen mensual no puede ser negativo")
        BigDecimal tasaDesgravamenMensual,

        @NotEmpty(message = "Debe especificar al menos un sistema de amortización permitido")
        List<SistemaAmortizacion> sistemasPermitidos,

        String descripcion,
        String unidadPlazo, // MESES o ANIOS
        List<CargoConfiguracionDto> cargosIndirectos
) {
    public ConfigurarCreditoRequestDto(
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
            String descripcion
    ) {
        this(nombre, entidad, segmentoBce, montoMin, montoMax, plazoMinMeses, plazoMaxMeses,
                tasaInteres, tasaDesgravamenMensual, sistemasPermitidos, descripcion, "MESES", List.of());
    }

    public record CargoConfiguracionDto(
            String nombre,
            String tipoCargo,    // FIJO o PORCENTAJE
            BigDecimal valor,
            String periodicidad, // MENSUAL o UNICO
            String baseCalculo,  // SALDO_DEUDOR, MONTO_SOLICITADO, FIJO
            String normaAplicable,
            Boolean obligatorio
    ) {}
}
