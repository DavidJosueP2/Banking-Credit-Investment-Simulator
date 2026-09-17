package com.edu.uta.backend.investment;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

class InvestmentCalculatorTests {

    private final InvestmentCalculator calculator = new InvestmentCalculator();

    @Test
    void calculatesSimpleInterestAtMaturity() {
        var result = calculator.calculate(new BigDecimal("5000.00"), new BigDecimal("0.053"),
                365, 365, BigDecimal.ZERO, "AT_MATURITY", LocalDate.of(2026, 1, 1));

        assertEquals(new BigDecimal("265.00"), result.grossInterest());
        assertEquals(new BigDecimal("5265.00"), result.maturityValue());
        assertEquals(1, result.payments().size());
    }

    @Test
    void distributesMonthlyInterestAndReturnsCapitalAtTheEnd() {
        var result = calculator.calculate(new BigDecimal("12000.00"), new BigDecimal("0.06"),
                60, 360, new BigDecimal("0.02"), "MONTHLY", LocalDate.of(2026, 1, 1));

        assertEquals(2, result.payments().size());
        assertEquals(new BigDecimal("0.00"), result.payments().getFirst().capital());
        assertEquals(new BigDecimal("12000.00"), result.payments().getLast().capital());
        assertEquals(new BigDecimal("120.00"), result.grossInterest());
        assertEquals(new BigDecimal("2.40"), result.withholding());
        assertEquals(new BigDecimal("12117.60"), result.maturityValue());
    }

    @Test
    void compoundsInterestAndPaysOnlyAtMaturity() {
        var result = calculator.calculate(new BigDecimal("5000.00"), new BigDecimal("0.04"),
                360, 360, BigDecimal.ZERO, "AT_MATURITY", "COMPOUND", "NOMINAL_ANNUAL", "MONTHLY",
                LocalDate.of(2026, 1, 1));

        assertEquals(1, result.payments().size());
        assertEquals(new BigDecimal("5203.71"), result.maturityValue());
        assertEquals(new BigDecimal("203.71"), result.grossInterest());
        assertEquals(new BigDecimal("5000.00"), result.payments().getFirst().capital());
    }

    @Test
    void appliesOnlyActiveTaxRulesToGrossInterest() {
        var rules = List.of(
                new InvestmentCalculator.TaxRule("PERCENTAGE", new BigDecimal("10"), "GROSS_INTEREST", true),
                new InvestmentCalculator.TaxRule("FIXED", new BigDecimal("2.00"), "GROSS_INTEREST", true),
                new InvestmentCalculator.TaxRule("PERCENTAGE", new BigDecimal("50"), "GROSS_INTEREST", false));

        var result = calculator.calculate(new BigDecimal("1000.00"), new BigDecimal("0.036"),
                30, 360, BigDecimal.ZERO, "AT_MATURITY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 1), rules);

        assertEquals(new BigDecimal("3.00"), result.grossInterest());
        assertEquals(new BigDecimal("2.30"), result.withholding());
        assertEquals(new BigDecimal("0.70"), result.netInterest());
        assertEquals(new BigDecimal("1000.70"), result.maturityValue());
    }

    @Test
    void calculatesEffectiveAnnualCompoundRate() {
        var result = calculator.calculate(new BigDecimal("1000.00"), new BigDecimal("0.12"),
                365, 365, BigDecimal.ZERO, "AT_MATURITY", "COMPOUND", "EFFECTIVE_ANNUAL", "MONTHLY",
                LocalDate.of(2026, 1, 1));

        assertEquals(new BigDecimal("120.00"), result.grossInterest());
        assertEquals(new BigDecimal("1120.00"), result.maturityValue());
    }
}
