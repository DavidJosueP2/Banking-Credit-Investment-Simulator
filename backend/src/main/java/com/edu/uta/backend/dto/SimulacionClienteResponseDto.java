package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;

import java.math.BigDecimal;
import java.util.List;

public record SimulacionClienteResponseDto(
        Long productoId,
        String nombreProducto,
        String entidad,
        String segmentoBce,
        BigDecimal monto,
        String frecuencia,
        Integer plazoMeses,
        Integer totalCuotas,
        BigDecimal tasaInteresAnual,
        BigDecimal tasaDesgravamenMensual,
        SistemaAmortizacion sistema,
        BigDecimal cuotaPeriodica,
        BigDecimal totalCapital,
        BigDecimal totalIntereses,
        BigDecimal totalDesgravamen,
        BigDecimal totalPagar,
        List<CuotaClienteDto> tablaCuotas,
        String usuario,
        BigDecimal costoTotal,
        String unidadPlazo,
        BigDecimal totalCargosIndirectos
) {
    public SimulacionClienteResponseDto(
            Long productoId,
            String nombreProducto,
            String entidad,
            String segmentoBce,
            BigDecimal monto,
            String frecuencia,
            Integer plazoMeses,
            Integer totalCuotas,
            BigDecimal tasaInteresAnual,
            BigDecimal tasaDesgravamenMensual,
            SistemaAmortizacion sistema,
            BigDecimal cuotaPeriodica,
            BigDecimal totalCapital,
            BigDecimal totalIntereses,
            BigDecimal totalDesgravamen,
            BigDecimal totalPagar,
            List<CuotaClienteDto> tablaCuotas,
            String usuario
    ) {
        this(productoId, nombreProducto, entidad, segmentoBce, monto, frecuencia, plazoMeses, totalCuotas,
                tasaInteresAnual, tasaDesgravamenMensual, sistema, cuotaPeriodica, totalCapital, totalIntereses,
                totalDesgravamen, totalPagar, tablaCuotas, usuario, null, "MESES", BigDecimal.ZERO);
    }

    public SimulacionClienteResponseDto(
            Long productoId,
            String nombreProducto,
            String entidad,
            String segmentoBce,
            BigDecimal monto,
            String frecuencia,
            Integer plazoMeses,
            Integer totalCuotas,
            BigDecimal tasaInteresAnual,
            BigDecimal tasaDesgravamenMensual,
            SistemaAmortizacion sistema,
            BigDecimal cuotaPeriodica,
            BigDecimal totalCapital,
            BigDecimal totalIntereses,
            BigDecimal totalDesgravamen,
            BigDecimal totalPagar,
            List<CuotaClienteDto> tablaCuotas
    ) {
        this(productoId, nombreProducto, entidad, segmentoBce, monto, frecuencia, plazoMeses, totalCuotas,
                tasaInteresAnual, tasaDesgravamenMensual, sistema, cuotaPeriodica, totalCapital, totalIntereses,
                totalDesgravamen, totalPagar, tablaCuotas, null, null, "MESES", BigDecimal.ZERO);
    }

    public record CuotaClienteDto(
            Integer numeroCuota,
            BigDecimal saldoInicial,
            BigDecimal capital,
            BigDecimal interes,
            BigDecimal desgravamen,
            BigDecimal cargosIndirectos,
            BigDecimal cuotaTotal,
            BigDecimal saldoFinal
    ) {
        public CuotaClienteDto(
                Integer numeroCuota,
                BigDecimal saldoInicial,
                BigDecimal capital,
                BigDecimal interes,
                BigDecimal desgravamen,
                BigDecimal cuotaTotal,
                BigDecimal saldoFinal
        ) {
            this(numeroCuota, saldoInicial, capital, interes, desgravamen, BigDecimal.ZERO, cuotaTotal, saldoFinal);
        }
    }
}
