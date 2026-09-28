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

    @Test
    void advancesCalendarPaymentsByCalendarMonths() {
        var result = calculator.calculate(new BigDecimal("1000.00"), new BigDecimal("0.12"),
                60, 360, BigDecimal.ZERO, "MONTHLY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 31), List.of(), "CALENDAR");

        assertEquals(LocalDate.of(2026, 2, 28), result.payments().get(0).paymentDate());
        assertEquals(LocalDate.of(2026, 3, 31), result.payments().get(1).paymentDate());
        assertEquals(LocalDate.of(2026, 4, 1), result.payments().get(2).paymentDate());
    }

    @Test
    void keepsTheOriginalCalendarAnchorForAWholeNumberOfMonths() {
        var result = calculator.calculate(new BigDecimal("1000.00"), new BigDecimal("0.12"),
                59, 360, BigDecimal.ZERO, "MONTHLY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 31), List.of(), "CALENDAR");

        assertEquals(2, result.payments().size());
        assertEquals(LocalDate.of(2026, 2, 28), result.payments().get(0).paymentDate());
        assertEquals(LocalDate.of(2026, 3, 31), result.payments().get(1).paymentDate());
    }

    @Test
    void appliesCompoundTaxOnlyAtMaturity() {
        var rules = List.of(new InvestmentCalculator.TaxRule(
                "PERCENTAGE", new BigDecimal("10"), "GROSS_INTEREST", true));

        var result = calculator.calculate(new BigDecimal("1000.00"), new BigDecimal("0.12"),
                60, 360, BigDecimal.ZERO, "AT_MATURITY", "COMPOUND", "NOMINAL_ANNUAL", "MONTHLY",
                LocalDate.of(2026, 1, 1), rules);

        assertEquals(new BigDecimal("2.01"), result.withholding());
        assertEquals(new BigDecimal("2.01"), result.payments().getFirst().withholding());
    }

    @Test
    void appliesCapitalChargeOnlyWhenCapitalIsReturned() {
        var rules = List.of(new InvestmentCalculator.TaxRule(
                "FIXED", new BigDecimal("100.00"), "CAPITAL", true));

        var result = calculator.calculate(new BigDecimal("500.00"), new BigDecimal("0.06"),
                60, 360, BigDecimal.ZERO, "MONTHLY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 1), rules);

        assertEquals(new BigDecimal("0.00"), result.payments().getFirst().withholding());
        assertEquals(new BigDecimal("100.00"), result.payments().getLast().withholding());
        assertEquals(new BigDecimal("405.00"), result.maturityValue());
    }

    @Test
    void capsAChargeAtTheAvailableInterestAndNeverProducesANegativePayment() {
        var rules = List.of(new InvestmentCalculator.TaxRule(
                "FIXED", new BigDecimal("100.00"), "GROSS_INTEREST", true));

        var result = calculator.calculate(new BigDecimal("500.00"), new BigDecimal("0.06"),
                60, 360, BigDecimal.ZERO, "MONTHLY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 1), rules);

        assertEquals(new BigDecimal("2.50"), result.payments().getFirst().withholding());
        assertEquals(new BigDecimal("0.00"), result.payments().getFirst().totalPayment());
        assertEquals(new BigDecimal("500.00"), result.maturityValue());
    }

    @Test
    void usesCommercialYearsForFixedDayAnnualPayments() {
        var result = calculator.calculate(new BigDecimal("1000.00"), new BigDecimal("0.06"),
                720, 360, BigDecimal.ZERO, "ANNUAL", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 1), List.of(), "FIXED_DAYS");

        assertEquals(2, result.payments().size());
        assertEquals(360, result.payments().getFirst().periodDays());
        assertEquals(360, result.payments().getLast().periodDays());
        assertEquals(new BigDecimal("120.00"), result.grossInterest());
        assertEquals(new BigDecimal("1120.00"), result.maturityValue());
    }

    private static InvestmentCalculator.Charge charge(long id, String percentage) {
        return new InvestmentCalculator.Charge(id, "Costo " + id, new BigDecimal(percentage));
    }

    @Test
    void deductsInterestPercentageChargesAtMaturity() {
        // 10.000 al 6 % por 360 días (base 360) = 600 de interés; retención 3 % = 18; costos 5 % + 2,5 % = 30 + 15.
        var result = calculator.calculate(new BigDecimal("10000.00"), new BigDecimal("0.06"),
                360, 360, new BigDecimal("0.03"), "AT_MATURITY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 1), List.of(), "FIXED_DAYS", List.of(charge(1, "5"), charge(2, "2.5")));

        assertEquals(new BigDecimal("582.00"), result.netInterest());
        assertEquals(new BigDecimal("45.00"), result.charges());
        assertEquals(new BigDecimal("10537.00"), result.maturityValue());
        assertEquals(new BigDecimal("30.00"), result.chargeDetails().getFirst().amount());
        assertEquals(new BigDecimal("15.00"), result.chargeDetails().getLast().amount());
    }

    @Test
    void chargesEachPaymentOnThatPeriodsInterest() {
        // 12.000 al 6 % mensual por 60 días: 60 de interés por mes; 10 % en cada pago = 6.
        var result = calculator.calculate(new BigDecimal("12000.00"), new BigDecimal("0.06"),
                60, 360, BigDecimal.ZERO, "MONTHLY", "SIMPLE", "NOMINAL_ANNUAL", null,
                LocalDate.of(2026, 1, 1), List.of(), "FIXED_DAYS", List.of(charge(1, "10")));

        assertEquals(new BigDecimal("6.00"), result.payments().getFirst().charges());
        assertEquals(new BigDecimal("54.00"), result.payments().getFirst().totalPayment());
        assertEquals(new BigDecimal("12.00"), result.charges());
        assertEquals(new BigDecimal("12108.00"), result.maturityValue());
    }

    @Test
    void deductsChargesFromTheCompoundMaturityValue() {
        var withoutCharges = calculator.calculate(new BigDecimal("5000.00"), new BigDecimal("0.04"),
                360, 360, BigDecimal.ZERO, "AT_MATURITY", "COMPOUND", "EFFECTIVE_ANNUAL", "MONTHLY",
                LocalDate.of(2026, 1, 1), List.of(), "FIXED_DAYS", List.of());
        var withCharges = calculator.calculate(new BigDecimal("5000.00"), new BigDecimal("0.04"),
                360, 360, BigDecimal.ZERO, "AT_MATURITY", "COMPOUND", "EFFECTIVE_ANNUAL", "MONTHLY",
                LocalDate.of(2026, 1, 1), List.of(), "FIXED_DAYS", List.of(charge(1, "10")));

        BigDecimal expectedCharge = withoutCharges.grossInterest().multiply(new BigDecimal("0.10"))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        assertEquals(expectedCharge, withCharges.charges());
        assertEquals(withoutCharges.maturityValue().subtract(expectedCharge), withCharges.maturityValue());
    }
}
