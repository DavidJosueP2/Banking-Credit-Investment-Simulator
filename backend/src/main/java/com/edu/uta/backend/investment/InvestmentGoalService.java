package com.edu.uta.backend.investment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;

/**
 * Meta de ahorro: "quiero reunir X en este plazo, ¿cuánto invierto?". Prueba capitales con el mismo
 * simulador de inversiones (tasas por tramo, retenciones, forma de pago), sin fórmula paralela.
 */
@Service
public class InvestmentGoalService {

    private static final BigDecimal CENT = new BigDecimal("0.01");

    private final InvestmentService investments;

    public InvestmentGoalService(InvestmentService investments) {
        this.investments = investments;
    }

    public record GoalRequest(long productId, BigDecimal targetAmount, Integer termValue, String termUnit,
                              String payoutFrequency) {}

    /** {@code coveredByMinimum}: el monto mínimo del producto ya alcanza o supera la meta. */
    public record GoalResult(BigDecimal requiredAmount, BigDecimal targetAmount, boolean coveredByMinimum,
                             InvestmentService.SimulationResult simulation) {}

    public GoalResult reach(GoalRequest request) {
        BigDecimal target = request.targetAmount();
        if (target == null || target.signum() <= 0) {
            throw new IllegalArgumentException("Ingresa cuánto quieres reunir.");
        }
        InvestmentService.Product product = investments.publicProducts().stream()
                .filter(item -> item.id() == request.productId())
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("El plan de inversión no está disponible."));

        BigDecimal minimum = product.minimumAmount();
        BigDecimal maximum = product.maximumAmount();
        InvestmentService.SimulationResult atMinimum = simulate(request, minimum);
        if (atMinimum.maturityValue().compareTo(target) >= 0) {
            return new GoalResult(minimum, target, true, atMinimum);
        }
        InvestmentService.SimulationResult atMaximum = simulate(request, maximum);
        if (atMaximum.maturityValue().compareTo(target) < 0) {
            throw new IllegalArgumentException(String.format(Locale.ROOT,
                    "Con el monto máximo de este plan ($%.2f) reunirías $%.2f en ese plazo. Elige un plazo mayor u otro plan.",
                    maximum, atMaximum.maturityValue()));
        }

        // "alto" siempre alcanza la meta; se busca el menor capital con precisión de centavo.
        BigDecimal low = minimum;
        BigDecimal high = maximum;
        InvestmentService.SimulationResult best = atMaximum;
        while (high.subtract(low).compareTo(CENT) > 0) {
            BigDecimal middle = low.add(high).divide(BigDecimal.TWO, 2, RoundingMode.HALF_UP);
            if (middle.compareTo(low) <= 0 || middle.compareTo(high) >= 0) break;
            InvestmentService.SimulationResult attempt = simulate(request, middle);
            if (attempt.maturityValue().compareTo(target) >= 0) {
                high = middle;
                best = attempt;
            } else {
                low = middle;
            }
        }
        return new GoalResult(high, target, false, best);
    }

    private InvestmentService.SimulationResult simulate(GoalRequest request, BigDecimal amount) {
        return investments.simulate(new InvestmentService.SimulationRequest(request.productId(), amount,
                request.termValue(), request.termUnit(), request.payoutFrequency()));
    }
}
