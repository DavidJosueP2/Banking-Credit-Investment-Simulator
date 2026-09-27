package com.edu.uta.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.investment.InvestmentGoalService;
import com.edu.uta.backend.investment.InvestmentService;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import org.junit.jupiter.api.Test;

/** "¿Cuánto me prestan?" y la meta de ahorro buscan sobre los simuladores reales (aquí simulados con reglas simples). */
class CapacidadYMetaTests {

    // ─── ¿Cuánto me prestan? ─────────────────────────────────────────────────

    private final SimuladorService simulador = mock(SimuladorService.class);
    private final ProductoCreditoRepository productos = mock(ProductoCreditoRepository.class);
    private final CapacidadPagoService capacidad = new CapacidadPagoService(simulador, productos);

    /** Cuota más alta = 5 % del monto + 12 USD fijos (como un seguro mensual). */
    private void creditoLineal() {
        ProductoCreditoEntity producto = new ProductoCreditoEntity();
        producto.setId(1L);
        producto.setMontoMin(new BigDecimal("500"));
        producto.setMontoMax(new BigDecimal("30000"));
        when(productos.findById(1L)).thenReturn(Optional.of(producto));
        when(simulador.simularCliente(any(SimulacionClienteRequestDto.class))).thenAnswer(inv -> {
            SimulacionClienteRequestDto req = inv.getArgument(0);
            BigDecimal cuota = req.monto().multiply(new BigDecimal("0.05")).add(new BigDecimal("12")).setScale(2, RoundingMode.HALF_UP);
            var fila = new SimulacionClienteResponseDto.CuotaClienteDto(1, req.monto(), req.monto(), BigDecimal.ZERO,
                    BigDecimal.ZERO, cuota, BigDecimal.ZERO);
            return new SimulacionClienteResponseDto(1L, "Consumo", "Banco", "CONSUMO_PRIORITARIO", req.monto(), "MENSUAL",
                    req.plazo(), 1, new BigDecimal("15"), BigDecimal.ZERO, req.sistema(), cuota, req.monto(),
                    BigDecimal.ZERO, BigDecimal.ZERO, cuota, List.of(fila));
        });
    }

    private CapacidadPagoService.Solicitud solicitud(String cuota) {
        return new CapacidadPagoService.Solicitud(1L, new BigDecimal(cuota), 24, SistemaAmortizacion.FRANCES, List.of());
    }

    @Test
    void encuentraElMayorMontoQueCabeEnLaCuota() {
        creditoLineal();
        var resultado = capacidad.calcular(solicitud("312"));
        // 0,05 × monto + 12 ≤ 312  →  monto ≤ 6.000
        assertTrue(resultado.cuotaMaxima().compareTo(new BigDecimal("312")) <= 0);
        assertTrue(resultado.montoMaximo().compareTo(new BigDecimal("5999")) >= 0, resultado.montoMaximo().toString());
        assertTrue(resultado.montoMaximo().compareTo(new BigDecimal("6000")) <= 0);
        assertEquals(false, resultado.limitadoPorProducto());
    }

    @Test
    void limitaAlMaximoDelProducto() {
        creditoLineal();
        var resultado = capacidad.calcular(solicitud("5000"));
        assertEquals(0, new BigDecimal("30000").compareTo(resultado.montoMaximo()));
        assertTrue(resultado.limitadoPorProducto());
    }

    @Test
    void avisaSiNoAlcanzaElMinimo() {
        creditoLineal();
        var ex = assertThrows(NormativaFinancieraException.class, () -> capacidad.calcular(solicitud("20")));
        assertTrue(ex.getMessage().contains("monto mínimo"), ex.getMessage());
    }

    // ─── Meta de ahorro ─────────────────────────────────────────────────────

    private final InvestmentService investments = mock(InvestmentService.class);
    private final InvestmentGoalService goals = new InvestmentGoalService(investments);

    /** Valor al vencimiento = capital × 1,05 (5 % neto en el plazo). */
    private void inversionAl5Porciento() {
        var product = new InvestmentService.Product(2L, "Plan", "", "USD", new BigDecimal("500"), new BigDecimal("100000"),
                31, 720, "DAYS", "LIST", 31, 720, 1, "SIMPLE", "NOMINAL_ANNUAL", null, "FIXED_DAYS", 360,
                BigDecimal.ZERO, true, null, null, List.of(360), List.of("AT_MATURITY"), List.of(), List.of(), List.of());
        when(investments.publicProducts()).thenReturn(List.of(product));
        when(investments.simulate(any())).thenAnswer(inv -> {
            InvestmentService.SimulationRequest req = inv.getArgument(0);
            BigDecimal maturity = req.amount().multiply(new BigDecimal("1.05")).setScale(2, RoundingMode.HALF_UP);
            return new InvestmentService.SimulationResult("INV", LocalDate.now(), 2L, "Plan", "USD", req.amount(), 360,
                    360, "360 días", 360, "DAYS", new BigDecimal("0.05"), "SIMPLE", "NOMINAL_ANNUAL", "AT_MATURITY", null, 360,
                    BigDecimal.ZERO, maturity.subtract(req.amount()), BigDecimal.ZERO, maturity.subtract(req.amount()),
                    maturity, LocalDate.now().plusDays(360), List.of(), null, List.of());
        });
    }

    private InvestmentGoalService.GoalRequest meta(String objetivo) {
        return new InvestmentGoalService.GoalRequest(2L, new BigDecimal(objetivo), 360, "DAYS", "AT_MATURITY");
    }

    @Test
    void calculaElCapitalMinimoParaLaMeta() {
        inversionAl5Porciento();
        var resultado = goals.reach(meta("10500"));
        // 10.500 / 1,05 = 10.000
        assertEquals(0, new BigDecimal("10000.00").compareTo(resultado.requiredAmount()), resultado.requiredAmount().toString());
        assertTrue(resultado.simulation().maturityValue().compareTo(new BigDecimal("10500")) >= 0);
    }

    @Test
    void conElMinimoYaSeCumple() {
        inversionAl5Porciento();
        var resultado = goals.reach(meta("300"));
        assertTrue(resultado.coveredByMinimum());
        assertEquals(0, new BigDecimal("500").compareTo(resultado.requiredAmount()));
    }

    @Test
    void metaInalcanzableConElMaximo() {
        inversionAl5Porciento();
        var ex = assertThrows(IllegalArgumentException.class, () -> goals.reach(meta("200000")));
        assertTrue(ex.getMessage().contains("monto máximo"), ex.getMessage());
    }
}
