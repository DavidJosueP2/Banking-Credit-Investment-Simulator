package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;

import java.math.BigDecimal;
import java.util.List;

public record SimulacionResponseDto(
        SistemaAmortizacion sistema,
        BigDecimal monto,
        Integer plazoMeses,
        BigDecimal tasaEfectivaAnual,
        BigDecimal tasaMensual,
        BigDecimal cuotaMensual,          // fija (francés) o primera cuota (alemán)
        BigDecimal totalIntereses,
        BigDecimal totalCargos,
        BigDecimal totalSeguros,
        BigDecimal totalPagar,
        /** Fecha de desembolso original (ISO-8601) */
        String fechaDesembolso,
        /** Tasa anual del seguro de desgravamen (% anual) */
        BigDecimal seguroDesgravamenPct,
        List<CuotaDto> tablaCuotas
) {
    public record CuotaDto(
            Integer numeroCuota,
            /** Fecha exacta de vencimiento de la cuota (ISO-8601) */
            String fechaVencimiento,
            BigDecimal saldoInicial,
            BigDecimal capital,
            BigDecimal interes,
            BigDecimal seguro,
            BigDecimal cargo,
            BigDecimal cuotaTotal,
            BigDecimal saldoFinal
    ) {}
}
