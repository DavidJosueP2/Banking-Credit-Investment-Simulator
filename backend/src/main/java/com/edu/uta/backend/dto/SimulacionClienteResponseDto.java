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
        List<CuotaClienteDto> tablaCuotas
) {
    public record CuotaClienteDto(
            Integer numeroCuota,
            BigDecimal saldoInicial,
            BigDecimal capital,
            BigDecimal interes,
            BigDecimal desgravamen,
            BigDecimal cuotaTotal,
            BigDecimal saldoFinal
    ) {}
}
