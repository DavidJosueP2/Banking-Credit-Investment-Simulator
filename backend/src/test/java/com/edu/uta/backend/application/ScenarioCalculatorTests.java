package com.edu.uta.backend.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.dto.ProductoSimuladorDto;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.investment.InvestmentCalculator;
import com.edu.uta.backend.investment.InvestmentService;
import com.edu.uta.backend.service.SimuladorService;
import org.junit.jupiter.api.Test;

class ScenarioCalculatorTests {

    private final SimuladorService credits = mock(SimuladorService.class);
    private final InvestmentService investments = mock(InvestmentService.class);
    private final ScenarioCalculator calculator = new ScenarioCalculator(credits, investments);

    @Test
    void translatesCreditResultAndDatesYearlyInstallments() {
        when(credits.obtenerProductosDisponibles()).thenReturn(List.of(product(7L)));
        when(credits.simularCliente(any(SimulacionClienteRequestDto.class))).thenReturn(creditResult("ANUAL"));

        var quote = calculator.quote(new ScenarioCalculator.Scenario("credit", 7L, new BigDecimal("10000"), 2,
                "frances", null, null));

        assertEquals("CREDIT", quote.productType());
        assertEquals("YEARS", quote.termUnit());
        assertEquals("FRANCES", quote.amortizationSystem());
        assertEquals(new BigDecimal("15.50"), quote.annualRate());
        assertEquals(2, quote.schedule().size());
        assertEquals(LocalDate.now().plusYears(1), quote.schedule().getFirst().dueDate());
        assertEquals(new BigDecimal("12.00"), quote.schedule().getFirst().insurance());
    }

    @Test
    void rejectsInactiveCreditProductsWithoutCalculating() {
        when(credits.obtenerProductosDisponibles()).thenReturn(List.of(product(1L)));

        var error = assertThrows(IllegalArgumentException.class, () -> calculator.quote(
                new ScenarioCalculator.Scenario("CREDIT", 99L, new BigDecimal("1000"), 12, "ALEMAN", null, null)));

        assertEquals("Ese tipo de crédito ya no está disponible.", error.getMessage());
        verify(credits, never()).simularCliente(any());
    }

    @Test
    void surfacesCreditRegulationMessages() {
        when(credits.obtenerProductosDisponibles()).thenReturn(List.of(product(1L)));
        when(credits.simularCliente(any())).thenThrow(new NormativaFinancieraException("Monto fuera de rango"));

        var error = assertThrows(IllegalArgumentException.class, () -> calculator.quote(
                new ScenarioCalculator.Scenario("CREDIT", 1L, new BigDecimal("1000"), 12, "FRANCES", null, null)));

        assertEquals("Monto fuera de rango", error.getMessage());
    }

    @Test
    void requiresAnAmortizationSystemForCredits() {
        assertThrows(IllegalArgumentException.class, () -> calculator.quote(
                new ScenarioCalculator.Scenario("CREDIT", 1L, new BigDecimal("1000"), 12, null, null, null)));
    }

    @Test
    void expressesInvestmentRateAsPercentage() {
        LocalDate today = LocalDate.now();
        var payment = new InvestmentCalculator.Payment(1, today.plusDays(90), 90, new BigDecimal("46.88"),
                BigDecimal.ZERO, new BigDecimal("46.88"), new BigDecimal("5000.00"), new BigDecimal("5046.88"));
        when(investments.simulate(any())).thenReturn(new InvestmentService.SimulationResult("INV-1", today, 2L,
                "Plan Crece", "USD", new BigDecimal("5000"), 90, 90, "90 días", 90, "DAYS", new BigDecimal("0.0375"),
                "SIMPLE", "NOMINAL_ANNUAL", "AT_MATURITY", null, 360, BigDecimal.ZERO, new BigDecimal("46.88"),
                BigDecimal.ZERO, new BigDecimal("46.88"), new BigDecimal("5046.88"), today.plusDays(90),
                List.of(), null, List.of(payment)));

        var quote = calculator.quote(new ScenarioCalculator.Scenario("INVESTMENT", 2L, new BigDecimal("5000"), 90,
                null, "at_maturity", null));

        assertEquals(0, new BigDecimal("3.75").compareTo(quote.annualRate()));
        assertEquals("AT_MATURITY", quote.payoutFrequency());
        assertNull(quote.periodicPayment());
        assertEquals(new BigDecimal("5046.88"), quote.totalAmount());
    }

    private static ProductoSimuladorDto product(Long id) {
        return new ProductoSimuladorDto(id, "Consumo", null, new BigDecimal("15.50"), new BigDecimal("0.06"),
                new BigDecimal("500"), new BigDecimal("30000"), 1, 5, "ANIOS",
                List.of(SistemaAmortizacion.FRANCES), "CONSUMO", List.of());
    }

    private static SimulacionClienteResponseDto creditResult(String frequency) {
        var rows = List.of(
                new SimulacionClienteResponseDto.CuotaClienteDto(1, new BigDecimal("10000.00"), new BigDecimal("4700.00"),
                        new BigDecimal("1550.00"), new BigDecimal("12.00"), new BigDecimal("6262.00"), new BigDecimal("5300.00")),
                new SimulacionClienteResponseDto.CuotaClienteDto(2, new BigDecimal("5300.00"), new BigDecimal("5300.00"),
                        new BigDecimal("821.50"), new BigDecimal("6.36"), new BigDecimal("6127.86"), BigDecimal.ZERO));
        return new SimulacionClienteResponseDto(7L, "Consumo", "Banco", "CONSUMO", new BigDecimal("10000"), frequency,
                24, 2, new BigDecimal("15.50"), new BigDecimal("0.06"), SistemaAmortizacion.FRANCES,
                new BigDecimal("6262.00"), new BigDecimal("10000.00"), new BigDecimal("2371.50"),
                new BigDecimal("18.36"), new BigDecimal("12389.86"), rows);
    }
}
