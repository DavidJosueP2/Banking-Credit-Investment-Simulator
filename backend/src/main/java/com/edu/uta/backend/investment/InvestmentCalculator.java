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
        if (principal == null || principal.signum() <= 0 || annualRate == null || annualRate.signum() <= 0) {
            throw new IllegalArgumentException("El capital y la tasa deben ser mayores que cero.");
        }
        if (termDays <= 0 || (dayCountBasis != 360 && dayCountBasis != 365)) {
            throw new IllegalArgumentException("El plazo o la base de cálculo no son válidos.");
        }

        int intervalDays = switch (payoutFrequency) {
            case "MONTHLY" -> 30;
            case "BIMONTHLY" -> 60;
            case "QUARTERLY" -> 90;
            case "SEMIANNUAL" -> 180;
            case "AT_MATURITY" -> termDays;
            default -> throw new IllegalArgumentException("La frecuencia de pago no es válida.");
        };

        List<Payment> payments = new ArrayList<>();
        BigDecimal grossTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        int elapsed = 0;
        int number = 1;
        while (elapsed < termDays) {
            int periodDays = Math.min(intervalDays, termDays - elapsed);
            elapsed += periodDays;
            BigDecimal gross = principal.multiply(annualRate)
                    .multiply(BigDecimal.valueOf(periodDays))
                    .divide(BigDecimal.valueOf(dayCountBasis), 2, RoundingMode.HALF_UP);
            BigDecimal tax = gross.multiply(withholdingRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = gross.subtract(tax);
            BigDecimal capital = elapsed == termDays ? principal.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2);
            payments.add(new Payment(number++, startDate.plusDays(elapsed), periodDays, gross, tax, net,
                    capital, net.add(capital)));
            grossTotal = grossTotal.add(gross);
            taxTotal = taxTotal.add(tax);
        }

        BigDecimal netTotal = grossTotal.subtract(taxTotal);
        return new Projection(grossTotal, taxTotal, netTotal, principal.add(netTotal).setScale(2, RoundingMode.HALF_UP),
                startDate.plusDays(termDays), List.copyOf(payments));
    }
}
