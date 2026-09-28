package com.edu.uta.backend.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.investment.InvestmentCalculator;
import com.edu.uta.backend.investment.InvestmentService;
import com.edu.uta.backend.service.SimuladorService;
import org.springframework.stereotype.Component;

/**
 * Puente hacia los simuladores de cada módulo. Las solicitudes no calculan nada por su cuenta:
 * piden el resultado al servicio dueño del producto y lo traducen a un formato común.
 */
@Component
public class ScenarioCalculator {

    public record Scenario(String productType, Long productId, BigDecimal amount, Integer term,
                           String amortizationSystem, String payoutFrequency, BigDecimal assetCost,
                           List<Long> optionalCharges, String termUnit) {
        public Scenario(String productType, Long productId, BigDecimal amount, Integer term,
                        String amortizationSystem, String payoutFrequency, BigDecimal assetCost) {
            this(productType, productId, amount, term, amortizationSystem, payoutFrequency, assetCost, null, null);
        }

        public Scenario(String productType, Long productId, BigDecimal amount, Integer term,
                        String amortizationSystem, String payoutFrequency, BigDecimal assetCost,
                        List<Long> optionalCharges) {
            this(productType, productId, amount, term, amortizationSystem, payoutFrequency, assetCost,
                    optionalCharges, null);
        }
    }

    public record Installment(int number, LocalDate dueDate, BigDecimal openingBalance, BigDecimal principal,
                              BigDecimal interest, BigDecimal insurance, BigDecimal charges,
                              BigDecimal withholding, BigDecimal payment, BigDecimal closingBalance) {}

    public record Quote(String productType, long productId, String productName, BigDecimal amount, int term,
                        String termUnit, String amortizationSystem, String payoutFrequency, BigDecimal assetCost,
                        BigDecimal annualRate, BigDecimal periodicPayment, BigDecimal totalInterest,
                        BigDecimal totalInsurance, BigDecimal totalCharges, BigDecimal totalWithholding,
                        BigDecimal totalAmount, LocalDate baseDate, List<Installment> schedule,
                        List<Long> optionalCharges, BigDecimal totalSolca) {

        /** Cobros opcionales elegidos, guardados como "3,7" (null si no hay). */
        public String optionalChargesCsv() {
            return optionalCharges == null || optionalCharges.isEmpty() ? null
                    : String.join(",", optionalCharges.stream().map(String::valueOf).toList());
        }
    }

    public static List<Long> parseOptionalCharges(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return java.util.Arrays.stream(csv.split(",")).map(String::trim).filter(v -> !v.isEmpty())
                .map(Long::valueOf).toList();
    }

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final SimuladorService credits;
    private final InvestmentService investments;

    public ScenarioCalculator(SimuladorService credits, InvestmentService investments) {
        this.credits = credits;
        this.investments = investments;
    }

    public Quote quote(Scenario scenario) {
        if (scenario == null || scenario.productId() == null) {
            throw new IllegalArgumentException("Selecciona un tipo de crédito o plan de inversión.");
        }
        if (scenario.amount() == null || scenario.amount().signum() <= 0) {
            throw new IllegalArgumentException("Ingresa un monto válido.");
        }
        if (scenario.term() == null || scenario.term() <= 0) {
            throw new IllegalArgumentException("Ingresa un plazo válido.");
        }
        return switch (normalizeType(scenario.productType())) {
            case "CREDIT" -> credit(scenario);
            case "INVESTMENT" -> investment(scenario);
            default -> throw new IllegalArgumentException("El tipo de producto no es válido.");
        };
    }

    /**
     * El tipo de crédito o plan sigue ofreciéndose a clientes nuevos. Lo ya aprobado no depende de esto:
     * conserva las condiciones congeladas con las que se firmó.
     */
    public boolean isAvailable(String productType, long productId) {
        return switch (normalizeType(productType)) {
            case "CREDIT" -> credits.obtenerProductosDisponibles().stream().anyMatch(item -> item.id() == productId);
            case "INVESTMENT" -> investments.publicProducts().stream().anyMatch(item -> item.id() == productId);
            default -> false;
        };
    }

    public static String normalizeType(String type) {
        return type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
    }

    private Quote credit(Scenario scenario) {
        SistemaAmortizacion system;
        try {
            system = SistemaAmortizacion.valueOf(normalizeType(scenario.amortizationSystem()));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Selecciona el sistema de amortización (francés o alemán).");
        }
        var product = credits.obtenerProductosDisponibles().stream()
                .filter(item -> item.id().equals(scenario.productId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Ese tipo de crédito ya no está disponible."));
        // Solo se aceptan cobros opcionales que existan en el producto; los obligatorios siempre se aplican.
        List<Long> optional = scenario.optionalCharges() == null ? List.of() : product.cargosIndirectos().stream()
                .filter(charge -> Boolean.FALSE.equals(charge.obligatorio()))
                .map(charge -> charge.id())
                .filter(scenario.optionalCharges()::contains)
                .sorted()
                .toList();

        SimulacionClienteResponseDto result;
        try {
            result = credits.simularCliente(new SimulacionClienteRequestDto(scenario.amount(), null, scenario.term(),
                    system, null, scenario.productId(), scenario.productId(), null, scenario.assetCost(),
                    scenario.productId(), optional));
        } catch (NormativaFinancieraException exception) {
            throw new IllegalArgumentException(exception.getMessage());
        }

        boolean yearly = "ANUAL".equalsIgnoreCase(result.frecuencia());
        LocalDate base = LocalDate.now();
        List<Installment> schedule = result.tablaCuotas().stream()
                .map(row -> new Installment(row.numeroCuota(),
                        yearly ? base.plusYears(row.numeroCuota()) : base.plusMonths(row.numeroCuota()),
                        row.saldoInicial(), row.capital(), row.interes(), zero(row.desgravamen()),
                        zero(row.cargosIndirectos()), BigDecimal.ZERO, row.cuotaTotal(), row.saldoFinal()))
                .toList();

        return new Quote("CREDIT", result.productoId(), result.nombreProducto(), result.monto(), scenario.term(),
                yearly ? "YEARS" : "MONTHS", system.name(), null, result.costoTotal(), result.tasaInteresAnual(),
                result.cuotaPeriodica(), result.totalIntereses(), zero(result.totalDesgravamen()),
                zero(result.totalCargosIndirectos()), BigDecimal.ZERO, result.totalPagar(), base, schedule, optional,
                zero(result.totalSolca()));
    }

    /** Unidad del plazo de inversión; sin unidad, el plazo se interpreta en días. */
    private static String investmentTermUnit(String termUnit) {
        String unit = termUnit == null || termUnit.isBlank() ? "DAYS" : termUnit.trim().toUpperCase(Locale.ROOT);
        if (!List.of("DAYS", "MONTHS", "YEARS").contains(unit)) {
            throw new IllegalArgumentException("Selecciona una unidad de plazo válida.");
        }
        return unit;
    }

    private Quote investment(Scenario scenario) {
        String frequency = normalizeType(scenario.payoutFrequency());
        if (frequency.isEmpty()) {
            throw new IllegalArgumentException("Selecciona cómo quieres recibir los intereses.");
        }
        InvestmentService.SimulationResult result = investments.simulate(new InvestmentService.SimulationRequest(
                scenario.productId(), scenario.amount(), scenario.term(), investmentTermUnit(scenario.termUnit()), frequency,
                scenario.optionalCharges() == null ? List.of() : scenario.optionalCharges()));

        List<Installment> schedule = result.payments().stream()
                .map(this::installment)
                .toList();
        BigDecimal periodic = result.payments().size() > 1 ? result.payments().getFirst().totalPayment() : null;

        return new Quote("INVESTMENT", result.productId(), result.productName(), result.amount(), result.termValue(),
                result.termUnit(), null, result.payoutFrequency(), null, result.annualRate().multiply(HUNDRED),
                periodic, result.netInterest(), BigDecimal.ZERO, result.charges(), result.withholding(),
                result.maturityValue(), result.simulationDate(), schedule,
                result.chargeDetails().stream().filter(charge -> !charge.mandatory())
                        .map(InvestmentService.ChargeDetail::id).toList(), BigDecimal.ZERO);
    }

    private Installment installment(InvestmentCalculator.Payment payment) {
        return new Installment(payment.number(), payment.paymentDate(), null, payment.capital(),
                payment.grossInterest(), BigDecimal.ZERO, payment.charges(), payment.withholding(),
                payment.totalPayment(), null);
    }

    private static BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
