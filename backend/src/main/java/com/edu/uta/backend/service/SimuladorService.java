package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.dto.SimulacionRequestDto;
import com.edu.uta.backend.dto.SimulacionResponseDto;
import com.edu.uta.backend.dto.SimulacionResponseDto.CuotaDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Servicio de cálculo de amortización con precisión bancaria.
 *
 * Sistema Francés (cuota fija):
 *   C = P * [i(1+i)^n] / [(1+i)^n - 1]
 *   donde i = tasa mensual efectiva, n = plazo en meses
 *
 * Sistema Alemán (amortización constante):
 *   Amortización = P / n (fija cada mes)
 *   Interés = Saldo * i (decrece cada mes)
 *   Cuota = Amortización + Interés (decrece)
 *
 * Seguro de Desgravamen:
 *   seguro_k = saldoInicial_k * (tasaAnualSeguro / 12 / 100)
 *   Se suma a la cuota total de cada mes.
 *
 * Fechas de Vencimiento:
 *   fechaVencimiento_k = fechaDesembolso + k meses (mismo día del mes)
 */
@Service
public class SimuladorService {

    private static final MathContext MC = new MathContext(15, RoundingMode.HALF_UP);
    private static final int SCALE = 2;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    public SimulacionResponseDto simular(SimulacionRequestDto req) {
        BigDecimal monto = req.monto();
        int n = req.plazoMeses();

        // Tasa efectiva anual → tasa mensual efectiva equivalente
        BigDecimal tasaAnual = req.tasaEfectiva().divide(BigDecimal.valueOf(100), MC);
        BigDecimal tasaMensual = calcularTasaMensual(tasaAnual);

        // Seguro de desgravamen: porcentaje anual (ej: 0.0699), se divide por 12 para mensual
        BigDecimal seguroPct = req.seguroDesgravamenPct() != null
                ? req.seguroDesgravamenPct().divide(BigDecimal.valueOf(100), MC)
                        .divide(BigDecimal.valueOf(12), MC)
                : BigDecimal.ZERO;

        // Fecha de desembolso (si no viene, usar hoy)
        LocalDate fechaDesembolso = req.fechaDesembolso() != null && !req.fechaDesembolso().isBlank()
                ? LocalDate.parse(req.fechaDesembolso(), ISO)
                : LocalDate.now();

        return req.sistema() == SistemaAmortizacion.FRANCES
                ? simularFrances(monto, n, tasaMensual, seguroPct, fechaDesembolso, req)
                : simularAleman(monto, n, tasaMensual, seguroPct, fechaDesembolso, req);
    }

    // ─── Sistema Francés ──────────────────────────────────────────────────────

    private SimulacionResponseDto simularFrances(BigDecimal monto, int n,
                                                  BigDecimal i, BigDecimal seguroPct,
                                                  LocalDate fechaDesembolso,
                                                  SimulacionRequestDto req) {
        // C = P * [i*(1+i)^n] / [(1+i)^n - 1]
        BigDecimal unoPlusI = BigDecimal.ONE.add(i, MC);
        BigDecimal potencia = unoPlusI.pow(n, MC);
        BigDecimal numerador = i.multiply(potencia, MC);
        BigDecimal denominador = potencia.subtract(BigDecimal.ONE, MC);
        BigDecimal cuotaBase = monto.multiply(numerador.divide(denominador, MC), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalSeguros = BigDecimal.ZERO;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal capital = cuotaBase.subtract(interes).setScale(SCALE, RoundingMode.HALF_UP);

            // Ajuste de redondeo en última cuota
            if (k == n) {
                capital = saldo.setScale(SCALE, RoundingMode.HALF_UP);
                interes = cuotaBase.subtract(capital).max(BigDecimal.ZERO);
            }

            BigDecimal seguro = saldoInicial.multiply(seguroPct, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal cuotaTotal = cuotaBase.add(seguro).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capital).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);
            totalIntereses = totalIntereses.add(interes);
            totalSeguros = totalSeguros.add(seguro);

            String fechaVencimiento = fechaDesembolso.plusMonths(k).format(ISO);

            tabla.add(new CuotaDto(k, fechaVencimiento, saldoInicial,
                    capital, interes, seguro, BigDecimal.ZERO,
                    cuotaTotal, saldoFinal.max(BigDecimal.ZERO)));
            saldo = saldoFinal.max(BigDecimal.ZERO);
        }

        BigDecimal totalPagar = cuotaBase.multiply(BigDecimal.valueOf(n))
                .add(totalSeguros)
                .setScale(SCALE, RoundingMode.HALF_UP);

        return new SimulacionResponseDto(
                SistemaAmortizacion.FRANCES, monto, n,
                req.tasaEfectiva(),
                i.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                // cuotaMensual: base sin seguro (el seguro varía cada mes en francés)
                cuotaBase.add(tabla.isEmpty() ? BigDecimal.ZERO : tabla.get(0).seguro()),
                totalIntereses.setScale(SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO,
                totalSeguros.setScale(SCALE, RoundingMode.HALF_UP),
                totalPagar,
                fechaDesembolso.format(ISO),
                req.seguroDesgravamenPct(),
                tabla
        );
    }

    // ─── Sistema Alemán ───────────────────────────────────────────────────────

    private SimulacionResponseDto simularAleman(BigDecimal monto, int n,
                                                 BigDecimal i, BigDecimal seguroPct,
                                                 LocalDate fechaDesembolso,
                                                 SimulacionRequestDto req) {
        BigDecimal amortizacion = monto.divide(BigDecimal.valueOf(n), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalSeguros = BigDecimal.ZERO;
        BigDecimal primeraCuota = null;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal capitalMes = (k == n) ? saldo.setScale(SCALE, RoundingMode.HALF_UP) : amortizacion;
            BigDecimal seguro = saldoInicial.multiply(seguroPct, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal cuotaTotal = capitalMes.add(interes).add(seguro).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capitalMes).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);
            totalIntereses = totalIntereses.add(interes);
            totalSeguros = totalSeguros.add(seguro);

            if (k == 1) primeraCuota = cuotaTotal;

            String fechaVencimiento = fechaDesembolso.plusMonths(k).format(ISO);

            tabla.add(new CuotaDto(k, fechaVencimiento, saldoInicial,
                    capitalMes, interes, seguro, BigDecimal.ZERO,
                    cuotaTotal, saldoFinal));
            saldo = saldoFinal;
        }

        BigDecimal totalPagar = monto.add(totalIntereses).add(totalSeguros)
                .setScale(SCALE, RoundingMode.HALF_UP);

        return new SimulacionResponseDto(
                SistemaAmortizacion.ALEMAN, monto, n,
                req.tasaEfectiva(),
                i.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                primeraCuota != null ? primeraCuota : BigDecimal.ZERO,
                totalIntereses.setScale(SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO,
                totalSeguros.setScale(SCALE, RoundingMode.HALF_UP),
                totalPagar,
                fechaDesembolso.format(ISO),
                req.seguroDesgravamenPct(),
                tabla
        );
    }

    // ─── Conversión de tasa ───────────────────────────────────────────────────

    /**
     * Convierte tasa efectiva anual a tasa efectiva mensual.
     * i_m = (1 + i_a)^(1/12) - 1
     */
    private BigDecimal calcularTasaMensual(BigDecimal tasaAnual) {
        double ta = tasaAnual.doubleValue();
        double tm = Math.pow(1.0 + ta, 1.0 / 12.0) - 1.0;
        return BigDecimal.valueOf(tm).round(MC);
    }
}
