package com.edu.uta.backend.investment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class InvestmentCalculator {

    public record TaxRule(String ruleType, BigDecimal value, String base, boolean active) {}

    /** Costo adicional de la institución: un porcentaje del interés bruto, descontado en cada pago. */
    public record Charge(long id, String name, BigDecimal percentage) {}

    public record ChargeAmount(long id, String name, BigDecimal amount) {}

    public record Payment(
            int number,
            LocalDate paymentDate,
            int periodDays,
            BigDecimal grossInterest,
            BigDecimal withholding,
            BigDecimal netInterest,
            BigDecimal capital,
            BigDecimal charges,
            BigDecimal totalPayment) {}

    public record Projection(
            BigDecimal grossInterest,
            BigDecimal withholding,
            BigDecimal netInterest,
            BigDecimal charges,
            BigDecimal maturityValue,
            LocalDate maturityDate,
            List<Payment> payments,
            List<ChargeAmount> chargeDetails) {}

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency, LocalDate startDate) {
        return calculate(principal, annualRate, termDays, dayCountBasis, withholdingRate, payoutFrequency,
                "SIMPLE", "NOMINAL_ANNUAL", null, startDate);
    }

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency,
            String calculationMethod, String rateType, String capitalizationFrequency, LocalDate startDate) {
        return calculate(principal, annualRate, termDays, dayCountBasis, withholdingRate, payoutFrequency,
                calculationMethod, rateType, capitalizationFrequency, startDate, List.of());
    }

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency,
            String calculationMethod, String rateType, String capitalizationFrequency, LocalDate startDate,
            List<TaxRule> taxRules) {
        return calculate(principal, annualRate, termDays, dayCountBasis, withholdingRate, payoutFrequency,
                calculationMethod, rateType, capitalizationFrequency, startDate, taxRules, "FIXED_DAYS");
    }

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency,
            String calculationMethod, String rateType, String capitalizationFrequency, LocalDate startDate,
            List<TaxRule> taxRules, String calendarMode) {
        return calculate(principal, annualRate, termDays, dayCountBasis, withholdingRate, payoutFrequency,
                calculationMethod, rateType, capitalizationFrequency, startDate, taxRules, calendarMode, List.of());
    }

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency,
            String calculationMethod, String rateType, String capitalizationFrequency, LocalDate startDate,
            List<TaxRule> taxRules, String calendarMode, List<Charge> charges) {
        if (principal == null || principal.signum() <= 0 || annualRate == null || annualRate.signum() <= 0
                || withholdingRate == null || withholdingRate.signum() < 0) {
            throw new IllegalArgumentException("El capital, la tasa y la retención deben ser válidos.");
        }
        if (termDays <= 0 || (dayCountBasis != 360 && dayCountBasis != 365)) {
            throw new IllegalArgumentException("El plazo o la base de cálculo no son válidos.");
        }
        if ("COMPOUND".equals(calculationMethod) && !"AT_MATURITY".equals(payoutFrequency)) {
            throw new IllegalArgumentException("Los productos compuestos pagan al vencimiento.");
        }

        List<Payment> payments = new ArrayList<>();
        BigDecimal balance = principal;
        BigDecimal grossTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        BigDecimal chargeTotal = BigDecimal.ZERO;
        BigDecimal[] chargeTotals = new BigDecimal[charges.size()];
        java.util.Arrays.fill(chargeTotals, BigDecimal.ZERO);
        int elapsed = 0;
        int number = 1;

        while (elapsed < termDays) {
            LocalDate previousDate = startDate.plusDays(elapsed);
            LocalDate nextDate = nextPaymentDate(startDate, previousDate, payoutFrequency,
                    termDays - elapsed, number, calendarMode);
            int periodDays = Math.toIntExact(ChronoUnit.DAYS.between(previousDate, nextDate));
            periodDays = Math.min(periodDays, termDays - elapsed);
            elapsed += periodDays;
            BigDecimal gross = interest(balance, annualRate, periodDays, dayCountBasis, calculationMethod,
                    rateType, capitalizationFrequency);
            boolean finalPayment = elapsed == termDays;
            BigDecimal legacyTax = "COMPOUND".equals(calculationMethod) && !finalPayment
                    ? BigDecimal.ZERO : gross.multiply(withholdingRate);
            BigDecimal maximumDeduction = gross.add(finalPayment ? balance : BigDecimal.ZERO);
            BigDecimal tax = legacyTax.add(taxes(taxRules, gross, balance, gross, finalPayment))
                    .min(maximumDeduction).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = gross.subtract(tax).setScale(2, RoundingMode.HALF_UP);
            BigDecimal capital = finalPayment ? principal.setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2);
            BigDecimal paymentCharges = BigDecimal.ZERO.setScale(2);
            for (int index = 0; index < charges.size(); index++) {
                BigDecimal amount = gross.multiply(charges.get(index).percentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                chargeTotals[index] = chargeTotals[index].add(amount);
                paymentCharges = paymentCharges.add(amount);
            }
            BigDecimal total = "COMPOUND".equals(calculationMethod)
                    ? finalPayment ? balance.add(gross).subtract(tax).subtract(paymentCharges).setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO.setScale(2)
                    : net.add(capital).subtract(paymentCharges).setScale(2, RoundingMode.HALF_UP);
            payments.add(new Payment(number++, previousDate.plusDays(periodDays), periodDays, gross, tax, net, capital,
                    paymentCharges, total));
            grossTotal = grossTotal.add(gross);
            taxTotal = taxTotal.add(tax);
            chargeTotal = chargeTotal.add(paymentCharges);
            if ("COMPOUND".equals(calculationMethod)) {
                balance = balance.add(gross);
            }

        }

        BigDecimal netTotal = grossTotal.subtract(taxTotal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal maturityValue = "COMPOUND".equals(calculationMethod)
                ? payments.getLast().totalPayment()
                : principal.add(netTotal).subtract(chargeTotal).setScale(2, RoundingMode.HALF_UP);
        List<ChargeAmount> chargeDetails = new ArrayList<>();
        for (int index = 0; index < charges.size(); index++) {
            Charge charge = charges.get(index);
            chargeDetails.add(new ChargeAmount(charge.id(), charge.name(), chargeTotals[index]));
        }
        return new Projection(grossTotal.setScale(2, RoundingMode.HALF_UP), taxTotal.setScale(2, RoundingMode.HALF_UP),
                netTotal, chargeTotal.setScale(2, RoundingMode.HALF_UP), maturityValue, startDate.plusDays(termDays),
                List.copyOf(payments), List.copyOf(chargeDetails));
    }

    private BigDecimal taxes(List<TaxRule> rules, BigDecimal gross, BigDecimal capital, BigDecimal total,
            boolean finalPayment) {
        return rules.stream().filter(TaxRule::active)
                .filter(rule -> finalPayment || "GROSS_INTEREST".equals(rule.base())).map(rule -> {
            BigDecimal base = switch (rule.base()) {
                case "CAPITAL" -> capital;
                case "TOTAL" -> total.add(capital);
                default -> gross;
            };
            BigDecimal calculated = "PERCENTAGE".equals(rule.ruleType())
                    ? base.multiply(rule.value()).divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP)
                    : rule.value();
            return calculated.min(base.max(BigDecimal.ZERO));
        }).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private LocalDate nextPaymentDate(LocalDate startDate, LocalDate previousDate, String frequency,
            int remainingDays, int paymentNumber, String calendarMode) {
        if ("AT_MATURITY".equals(frequency)) return previousDate.plusDays(remainingDays);
        if ("CALENDAR".equals(calendarMode)) {
            int months = switch (frequency) {
                case "MONTHLY" -> 1;
                case "BIMONTHLY" -> 2;
                case "QUARTERLY" -> 3;
                case "SEMIANNUAL" -> 6;
                case "ANNUAL" -> 12;
                default -> throw new IllegalArgumentException("La frecuencia de pago no es válida.");
            };
            LocalDate maturity = previousDate.plusDays(remainingDays);
            LocalDate scheduled = startDate.plusMonths((long) months * paymentNumber);
            return scheduled.isAfter(maturity) ? maturity : scheduled;
        }
        int days = switch (frequency) {
            case "MONTHLY" -> 30;
            case "BIMONTHLY" -> 60;
            case "QUARTERLY" -> 90;
            case "SEMIANNUAL" -> 180;
            case "ANNUAL" -> 360;
            default -> throw new IllegalArgumentException("La frecuencia de pago no es válida.");
        };
        return previousDate.plusDays(Math.min(days, remainingDays));
    }

    private BigDecimal interest(BigDecimal balance, BigDecimal annualRate, int periodDays, int basis,
            String calculationMethod, String rateType, String capitalizationFrequency) {
        if (!"COMPOUND".equals(calculationMethod)) {
            return balance.multiply(annualRate).multiply(BigDecimal.valueOf(periodDays))
                    .divide(BigDecimal.valueOf(basis), 2, RoundingMode.HALF_UP);
        }
        int capitalizationDays = switch (capitalizationFrequency) {
            case "MONTHLY" -> 30;
            case "BIMONTHLY" -> 60;
            case "QUARTERLY" -> 90;
            case "SEMIANNUAL" -> 180;
            case "ANNUAL" -> basis;
            default -> throw new IllegalArgumentException("La frecuencia de capitalización no es válida.");
        };
        double periods = (double) periodDays / capitalizationDays;
        double periodicRate = "EFFECTIVE_ANNUAL".equals(rateType)
                ? Math.pow(1 + annualRate.doubleValue(), capitalizationDays / (double) basis) - 1
                : annualRate.doubleValue() / (basis / (double) capitalizationDays);
        double factor = Math.pow(1 + periodicRate, periods);
        return balance.multiply(BigDecimal.valueOf(factor - 1)).setScale(2, RoundingMode.HALF_UP);
    }
}
