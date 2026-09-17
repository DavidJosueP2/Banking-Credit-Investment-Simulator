package com.edu.uta.backend.investment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class InvestmentCalculator {

    public record Payment(
            int number,
            LocalDate paymentDate,
            int periodDays,
            BigDecimal grossInterest,
            BigDecimal withholding,
            BigDecimal netInterest,
            BigDecimal capital,
            BigDecimal totalPayment) {}

    public record Projection(
            BigDecimal grossInterest,
            BigDecimal withholding,
            BigDecimal netInterest,
            BigDecimal maturityValue,
            LocalDate maturityDate,
            List<Payment> payments) {}

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency, LocalDate startDate) {
        return calculate(principal, annualRate, termDays, dayCountBasis, withholdingRate, payoutFrequency,
                "SIMPLE", "NOMINAL_ANNUAL", null, startDate);
    }

    public Projection calculate(BigDecimal principal, BigDecimal annualRate, int termDays,
            int dayCountBasis, BigDecimal withholdingRate, String payoutFrequency,
            String calculationMethod, String rateType, String capitalizationFrequency, LocalDate startDate) {
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

        int intervalDays = intervalDays(payoutFrequency, termDays);
        List<Payment> payments = new ArrayList<>();
        BigDecimal balance = principal;
        BigDecimal grossTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        int elapsed = 0;
        int number = 1;

        while (elapsed < termDays) {
            int periodDays = Math.min(intervalDays, termDays - elapsed);
            elapsed += periodDays;
            BigDecimal gross = interest(balance, annualRate, periodDays, dayCountBasis, calculationMethod,
                    rateType, capitalizationFrequency);
            BigDecimal tax = gross.multiply(withholdingRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = gross.subtract(tax).setScale(2, RoundingMode.HALF_UP);
            boolean finalPayment = elapsed == termDays;
            BigDecimal capital = finalPayment ? principal.setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2);
            BigDecimal total = "COMPOUND".equals(calculationMethod)
                    ? finalPayment ? balance.add(gross).subtract(tax).setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO.setScale(2)
                    : net.add(capital).setScale(2, RoundingMode.HALF_UP);
            payments.add(new Payment(number++, startDate.plusDays(elapsed), periodDays, gross, tax, net, capital, total));
            grossTotal = grossTotal.add(gross);
            taxTotal = taxTotal.add(tax);
            if ("COMPOUND".equals(calculationMethod)) {
                balance = balance.add(gross);
            }
        }

        BigDecimal netTotal = grossTotal.subtract(taxTotal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal maturityValue = "COMPOUND".equals(calculationMethod)
                ? payments.getLast().totalPayment()
                : principal.add(netTotal).setScale(2, RoundingMode.HALF_UP);
        return new Projection(grossTotal.setScale(2, RoundingMode.HALF_UP), taxTotal.setScale(2, RoundingMode.HALF_UP),
                netTotal, maturityValue, startDate.plusDays(termDays), List.copyOf(payments));
    }

    private int intervalDays(String frequency, int termDays) {
        return switch (frequency) {
            case "MONTHLY" -> 30;
            case "BIMONTHLY" -> 60;
            case "QUARTERLY" -> 90;
            case "SEMIANNUAL" -> 180;
            case "ANNUAL" -> 365;
            case "AT_MATURITY" -> termDays;
            default -> throw new IllegalArgumentException("La frecuencia de pago no es válida.");
        };
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
            case "ANNUAL" -> 365;
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
