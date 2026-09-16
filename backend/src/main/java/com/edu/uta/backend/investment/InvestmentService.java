package com.edu.uta.backend.investment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvestmentService {

    private static final Set<String> PAYOUT_FREQUENCIES = Set.of(
            "AT_MATURITY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL");

    private final JdbcTemplate jdbc;
    private final InvestmentCalculator calculator;

    public InvestmentService(JdbcTemplate jdbc, InvestmentCalculator calculator) {
        this.jdbc = jdbc;
        this.calculator = calculator;
    }

    public record RateTier(Long id, String label, BigDecimal minimumAmount, BigDecimal maximumAmount,
            int minimumTermDays, int maximumTermDays, BigDecimal annualRate, int position) {}

    public record Product(Long id, String name, String description, String currency,
            BigDecimal minimumAmount, BigDecimal maximumAmount, int minimumTermDays, int maximumTermDays,
            String payoutFrequency, int dayCountBasis, BigDecimal withholdingRate, boolean active,
            OffsetDateTime createdAt, OffsetDateTime updatedAt, List<RateTier> rates) {}

    public record RateInput(String label, BigDecimal minimumAmount, BigDecimal maximumAmount,
            int minimumTermDays, int maximumTermDays, BigDecimal annualRate) {}

    public record ProductInput(String name, String description, BigDecimal minimumAmount,
            BigDecimal maximumAmount, int minimumTermDays, int maximumTermDays, String payoutFrequency,
            int dayCountBasis, BigDecimal withholdingRate, boolean active, List<RateInput> rates) {}

    public record SimulationRequest(long productId, BigDecimal amount, int termDays) {}

    public record SimulationResult(String reference, LocalDate simulationDate, long productId,
            String productName, String currency, BigDecimal amount, int termDays, String rateLabel,
            BigDecimal annualRate, String payoutFrequency, int dayCountBasis, BigDecimal withholdingRate,
            BigDecimal grossInterest, BigDecimal withholding, BigDecimal netInterest,
            BigDecimal maturityValue, LocalDate maturityDate, List<InvestmentCalculator.Payment> payments) {}

    public List<Product> publicProducts() {
        return loadProducts(true);
    }

    public List<Product> adminProducts() {
        return loadProducts(false);
    }

    private List<Product> loadProducts(boolean activeOnly) {
        String sql = """
                SELECT id, name, description, currency, minimum_amount, maximum_amount,
                       minimum_term_days, maximum_term_days, payout_frequency, day_count_basis,
                       withholding_rate, active, created_at, updated_at
                FROM investment_products
                """ + (activeOnly ? " WHERE active = TRUE " : " ") + " ORDER BY name, id";
        return jdbc.query(sql, (rs, row) -> new Product(
                rs.getLong("id"), rs.getString("name"), rs.getString("description"), rs.getString("currency"),
                rs.getBigDecimal("minimum_amount"), rs.getBigDecimal("maximum_amount"),
                rs.getInt("minimum_term_days"), rs.getInt("maximum_term_days"),
                rs.getString("payout_frequency"), rs.getInt("day_count_basis"),
                rs.getBigDecimal("withholding_rate"), rs.getBoolean("active"),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class),
                ratesFor(rs.getLong("id"))));
    }

    private List<RateTier> ratesFor(long productId) {
        return jdbc.query("""
                SELECT id, label, minimum_amount, maximum_amount, minimum_term_days,
                       maximum_term_days, annual_rate, position
                FROM investment_product_rates WHERE product_id = ? ORDER BY position, id
                """, (rs, row) -> new RateTier(rs.getLong("id"), rs.getString("label"),
                rs.getBigDecimal("minimum_amount"), rs.getBigDecimal("maximum_amount"),
                rs.getInt("minimum_term_days"), rs.getInt("maximum_term_days"),
                rs.getBigDecimal("annual_rate"), rs.getInt("position")), productId);
    }

    @Transactional
    public Product create(ProductInput input, long userId) {
        validate(input);
        Long id = jdbc.queryForObject("""
                INSERT INTO investment_products (
                    name, description, currency, minimum_amount, maximum_amount, minimum_term_days,
                    maximum_term_days, payout_frequency, day_count_basis, withholding_rate, active, updated_by
                ) VALUES (?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, input.name().trim(), normalizedDescription(input.description()),
                input.minimumAmount(), input.maximumAmount(), input.minimumTermDays(), input.maximumTermDays(),
                input.payoutFrequency(), input.dayCountBasis(), input.withholdingRate(), input.active(), userId);
        replaceRates(id, input.rates());
        return productById(id, false);
    }

    @Transactional
    public Product update(long id, ProductInput input, long userId) {
        validate(input);
        int changed = jdbc.update("""
                UPDATE investment_products SET name = ?, description = ?, minimum_amount = ?, maximum_amount = ?,
                    minimum_term_days = ?, maximum_term_days = ?, payout_frequency = ?, day_count_basis = ?,
                    withholding_rate = ?, active = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
                WHERE id = ?
                """, input.name().trim(), normalizedDescription(input.description()), input.minimumAmount(),
                input.maximumAmount(), input.minimumTermDays(), input.maximumTermDays(), input.payoutFrequency(),
                input.dayCountBasis(), input.withholdingRate(), input.active(), userId, id);
        if (changed == 0) throw new NoSuchElementException("No se encontró el producto de inversión.");
        replaceRates(id, input.rates());
        return productById(id, false);
    }

    @Transactional
    public Product changeStatus(long id, boolean active, long userId) {
        int changed = jdbc.update("""
                UPDATE investment_products SET active = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?
                """, active, userId, id);
        if (changed == 0) throw new NoSuchElementException("No se encontró el producto de inversión.");
        return productById(id, false);
    }

    public SimulationResult simulate(SimulationRequest request) {
        Product product = productById(request.productId(), true);
        if (request.amount() == null || request.amount().compareTo(product.minimumAmount()) < 0
                || request.amount().compareTo(product.maximumAmount()) > 0) {
            throw new IllegalArgumentException("El monto está fuera del rango permitido para el producto.");
        }
        if (request.termDays() < product.minimumTermDays() || request.termDays() > product.maximumTermDays()) {
            throw new IllegalArgumentException("El plazo está fuera del rango permitido para el producto.");
        }
        RateTier rate = product.rates().stream()
                .filter(item -> request.amount().compareTo(item.minimumAmount()) >= 0
                        && request.amount().compareTo(item.maximumAmount()) <= 0
                        && request.termDays() >= item.minimumTermDays()
                        && request.termDays() <= item.maximumTermDays())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No existe una tasa configurada para la combinación de monto y plazo."));
        LocalDate today = LocalDate.now();
        InvestmentCalculator.Projection projection = calculator.calculate(request.amount(), rate.annualRate(),
                request.termDays(), product.dayCountBasis(), product.withholdingRate(),
                product.payoutFrequency(), today);
        String reference = "INV-" + today.toString().replace("-", "") + "-" + product.id()
                + "-" + request.termDays();
        return new SimulationResult(reference, today, product.id(), product.name(), product.currency(),
                request.amount(), request.termDays(), rate.label(), rate.annualRate(), product.payoutFrequency(),
                product.dayCountBasis(), product.withholdingRate(), projection.grossInterest(),
                projection.withholding(), projection.netInterest(), projection.maturityValue(),
                projection.maturityDate(), projection.payments());
    }

    private Product productById(long id, boolean activeOnly) {
        String sql = """
                SELECT id, name, description, currency, minimum_amount, maximum_amount,
                       minimum_term_days, maximum_term_days, payout_frequency, day_count_basis,
                       withholding_rate, active, created_at, updated_at
                FROM investment_products WHERE id = ?
                """ + (activeOnly ? " AND active = TRUE" : "");
        List<Product> products = jdbc.query(sql, (rs, row) -> new Product(rs.getLong("id"), rs.getString("name"),
                rs.getString("description"), rs.getString("currency"), rs.getBigDecimal("minimum_amount"),
                rs.getBigDecimal("maximum_amount"), rs.getInt("minimum_term_days"), rs.getInt("maximum_term_days"),
                rs.getString("payout_frequency"), rs.getInt("day_count_basis"), rs.getBigDecimal("withholding_rate"),
                rs.getBoolean("active"), rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("updated_at", OffsetDateTime.class), ratesFor(id)), id);
        if (products.isEmpty()) throw new NoSuchElementException("No se encontró el producto de inversión.");
        return products.getFirst();
    }

    private void replaceRates(long productId, List<RateInput> rates) {
        jdbc.update("DELETE FROM investment_product_rates WHERE product_id = ?", productId);
        for (int index = 0; index < rates.size(); index++) {
            RateInput rate = rates.get(index);
            jdbc.update("""
                    INSERT INTO investment_product_rates (
                        product_id, label, minimum_amount, maximum_amount,
                        minimum_term_days, maximum_term_days, annual_rate, position
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, productId, rate.label().trim(), rate.minimumAmount(), rate.maximumAmount(),
                    rate.minimumTermDays(), rate.maximumTermDays(), rate.annualRate(), index);
        }
    }

    private void validate(ProductInput input) {
        if (input == null || input.name() == null || input.name().isBlank() || input.name().trim().length() > 120) {
            throw new IllegalArgumentException("Ingresa un nombre de producto válido.");
        }
        if (normalizedDescription(input.description()).length() > 600) {
            throw new IllegalArgumentException("La descripción no puede superar 600 caracteres.");
        }
        if (input.minimumAmount() == null || input.maximumAmount() == null || input.minimumAmount().signum() <= 0
                || input.maximumAmount().compareTo(input.minimumAmount()) < 0) {
            throw new IllegalArgumentException("El rango de montos no es válido.");
        }
        if (input.minimumTermDays() <= 0 || input.maximumTermDays() < input.minimumTermDays()) {
            throw new IllegalArgumentException("El rango de plazos no es válido.");
        }
        if (!PAYOUT_FREQUENCIES.contains(input.payoutFrequency())) {
            throw new IllegalArgumentException("Selecciona una frecuencia de pago válida.");
        }
        if (input.dayCountBasis() != 360 && input.dayCountBasis() != 365) {
            throw new IllegalArgumentException("La base anual debe ser de 360 o 365 días.");
        }
        if (input.withholdingRate() == null || input.withholdingRate().signum() < 0
                || input.withholdingRate().compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("La retención debe estar entre 0 % y 100 %.");
        }
        if (input.rates() == null || input.rates().isEmpty()) {
            throw new IllegalArgumentException("Configura al menos un rango de tasa.");
        }

        List<RateInput> checked = new ArrayList<>();
        Set<String> labels = new HashSet<>();
        for (RateInput rate : input.rates()) {
            validateRate(rate, input);
            if (!labels.add(rate.label().trim().toLowerCase())) {
                throw new IllegalArgumentException("Los nombres de los rangos de tasa no pueden repetirse.");
            }
            for (RateInput previous : checked) {
                boolean amountsOverlap = rate.minimumAmount().compareTo(previous.maximumAmount()) <= 0
                        && previous.minimumAmount().compareTo(rate.maximumAmount()) <= 0;
                boolean termsOverlap = rate.minimumTermDays() <= previous.maximumTermDays()
                        && previous.minimumTermDays() <= rate.maximumTermDays();
                if (amountsOverlap && termsOverlap) {
                    throw new IllegalArgumentException("Existen rangos de tasa superpuestos.");
                }
            }
            checked.add(rate);
        }
    }

    private void validateRate(RateInput rate, ProductInput product) {
        if (rate == null || rate.label() == null || rate.label().isBlank() || rate.label().trim().length() > 100) {
            throw new IllegalArgumentException("Cada tasa debe tener un nombre válido.");
        }
        if (rate.minimumAmount() == null || rate.maximumAmount() == null
                || rate.minimumAmount().compareTo(product.minimumAmount()) < 0
                || rate.maximumAmount().compareTo(product.maximumAmount()) > 0
                || rate.maximumAmount().compareTo(rate.minimumAmount()) < 0) {
            throw new IllegalArgumentException("Un rango de tasa contiene montos fuera del producto.");
        }
        if (rate.minimumTermDays() < product.minimumTermDays()
                || rate.maximumTermDays() > product.maximumTermDays()
                || rate.maximumTermDays() < rate.minimumTermDays()) {
            throw new IllegalArgumentException("Un rango de tasa contiene plazos fuera del producto.");
        }
        if (rate.annualRate() == null || rate.annualRate().signum() <= 0
                || rate.annualRate().compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("La tasa anual debe ser mayor que 0 % y menor o igual que 100 %.");
        }
    }

    private String normalizedDescription(String description) {
        return description == null ? "" : description.trim();
    }
}
