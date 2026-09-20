package com.edu.uta.backend.investment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvestmentService {

    private static final Set<String> PAYOUT_FREQUENCIES = Set.of(
            "AT_MATURITY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL");
    private static final Set<String> CALCULATION_METHODS = Set.of("SIMPLE", "COMPOUND");
    private static final Set<String> RATE_TYPES = Set.of("NOMINAL_ANNUAL", "EFFECTIVE_ANNUAL");
    private static final Set<String> CAPITALIZATION_FREQUENCIES = Set.of(
            "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL");

    private final JdbcTemplate jdbc;
    private final InvestmentCalculator calculator;

    public InvestmentService(JdbcTemplate jdbc, InvestmentCalculator calculator) {
        this.jdbc = jdbc;
        this.calculator = calculator;
    }

    public record RateTier(Long id, String label, BigDecimal minimumAmount, BigDecimal maximumAmount,
            int minimumTermDays, int maximumTermDays, int minimumTermValue, int maximumTermValue,
            BigDecimal annualRate, int position) {}
    public record TaxRule(Long id, String name, String ruleType, BigDecimal value, String base, boolean active, int position) {}

    public record Product(Long id, String name, String description, String currency,
            BigDecimal minimumAmount, BigDecimal maximumAmount, int minimumTermDays, int maximumTermDays,
            String termUnit, String termSelection, int minimumTermValue, int maximumTermValue, int termIncrement,
            String calculationMethod, String rateType, String capitalizationFrequency, String calendarMode, int dayCountBasis,
            BigDecimal withholdingRate, boolean active, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            List<Integer> terms, List<String> payoutFrequencies, List<RateTier> rates, List<TaxRule> taxRules) {}

    public record RateInput(String label, BigDecimal minimumAmount, BigDecimal maximumAmount,
            int minimumTermDays, int maximumTermDays, int minimumTermValue, int maximumTermValue,
            BigDecimal annualRate) {}

    public record ProductInput(String name, String description, BigDecimal minimumAmount,
            BigDecimal maximumAmount, int minimumTermDays, int maximumTermDays, String calculationMethod,
            String rateType, String capitalizationFrequency, String calendarMode, int dayCountBasis, BigDecimal withholdingRate,
            boolean active, List<Integer> terms, List<String> payoutFrequencies, List<RateInput> rates,
            String termUnit, String termSelection, Integer minimumTermValue, Integer maximumTermValue,
            Integer termIncrement, List<TaxRule> taxRules) {}

    public record SimulationRequest(long productId, BigDecimal amount, int termDays, String payoutFrequency) {}

    public record SimulationResult(String reference, LocalDate simulationDate, long productId,
            String productName, String currency, BigDecimal amount, int termDays, String rateLabel,
            int termValue, String termUnit,
            BigDecimal annualRate, String calculationMethod, String rateType, String payoutFrequency,
            String capitalizationFrequency, int dayCountBasis, BigDecimal withholdingRate,
            BigDecimal grossInterest, BigDecimal withholding, BigDecimal netInterest,
            BigDecimal maturityValue, LocalDate maturityDate, List<InvestmentCalculator.Payment> payments) {}

    public List<Product> publicProducts() { return loadProducts(true); }
    public List<Product> adminProducts() { return loadProducts(false); }

    private List<Product> loadProducts(boolean activeOnly) {
        String sql = """
                SELECT id, name, description, currency, minimum_amount, maximum_amount,
                       minimum_term_days, maximum_term_days, term_unit, term_selection,
                       minimum_term_value, maximum_term_value, term_increment, calculation_method, rate_type,
                       capitalization_frequency, calendar_mode, day_count_basis, withholding_rate, active,
                       created_at, updated_at
                FROM investment_products
                """ + (activeOnly ? " WHERE active = TRUE " : " ") + " ORDER BY name, id";
        return jdbc.query(sql, (rs, row) -> product(rs, rs.getLong("id")));
    }

    private Product product(java.sql.ResultSet rs, long id) throws java.sql.SQLException {
        return new Product(id, rs.getString("name"), rs.getString("description"), rs.getString("currency"),
                rs.getBigDecimal("minimum_amount"), rs.getBigDecimal("maximum_amount"),
                rs.getInt("minimum_term_days"), rs.getInt("maximum_term_days"),
                rs.getString("term_unit"), rs.getString("term_selection"),
                rs.getInt("minimum_term_value"), rs.getInt("maximum_term_value"), rs.getInt("term_increment"),
                rs.getString("calculation_method"), rs.getString("rate_type"),
                rs.getString("capitalization_frequency"), rs.getString("calendar_mode"), rs.getInt("day_count_basis"),
                rs.getBigDecimal("withholding_rate"), rs.getBoolean("active"),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class),
                termsFor(id), payoutFrequenciesFor(id), ratesFor(id), taxRulesFor(id));
    }

    private List<Integer> termsFor(long productId) {
        return jdbc.queryForList("SELECT term_value FROM investment_product_terms WHERE product_id = ? ORDER BY position, term_value",
                Integer.class, productId);
    }

    private List<String> payoutFrequenciesFor(long productId) {
        return jdbc.queryForList("SELECT frequency FROM investment_product_payout_frequencies WHERE product_id = ? ORDER BY position, frequency",
                String.class, productId);
    }

    private List<RateTier> ratesFor(long productId) {
        return jdbc.query("""
                SELECT id, label, minimum_amount, maximum_amount, minimum_term_days,
                       maximum_term_days, minimum_term_value, maximum_term_value, annual_rate, position
                FROM investment_product_rates WHERE product_id = ? ORDER BY position, id
                """, (rs, row) -> new RateTier(rs.getLong("id"), rs.getString("label"),
                rs.getBigDecimal("minimum_amount"), rs.getBigDecimal("maximum_amount"),
                rs.getInt("minimum_term_days"), rs.getInt("maximum_term_days"),
                rs.getInt("minimum_term_value"), rs.getInt("maximum_term_value"),
                rs.getBigDecimal("annual_rate"), rs.getInt("position")), productId);
    }

    private List<TaxRule> taxRulesFor(long productId) {
        return jdbc.query("""
                SELECT id, name, rule_type, value, base, active, position
                FROM investment_product_tax_rules WHERE product_id = ? ORDER BY position, id
                """, (rs, row) -> new TaxRule(rs.getLong("id"), rs.getString("name"),
                rs.getString("rule_type"), rs.getBigDecimal("value"), rs.getString("base"),
                rs.getBoolean("active"), rs.getInt("position")), productId);
    }

    @Transactional
    public Product create(ProductInput input, long userId) {
        validate(input);
        Long id = jdbc.queryForObject("""
                INSERT INTO investment_products (
                    name, description, currency, minimum_amount, maximum_amount, minimum_term_days,
                    maximum_term_days, term_unit, term_selection, minimum_term_value, maximum_term_value,
                    term_increment, calculation_method, rate_type, capitalization_frequency,
                    calendar_mode, day_count_basis, withholding_rate, active, updated_by
                ) VALUES (?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, input.name().trim(), normalizedDescription(input.description()),
                input.minimumAmount(), input.maximumAmount(), input.minimumTermDays(), input.maximumTermDays(),
                input.termUnit(), input.termSelection(), input.minimumTermValue(), input.maximumTermValue(),
                input.termIncrement(),
                input.calculationMethod(), input.rateType(), input.capitalizationFrequency(), input.calendarMode(), input.dayCountBasis(),
                BigDecimal.ZERO, input.active(), userId);
        replaceChildren(id, input);
        return productById(id, false);
    }

    @Transactional
    public Product update(long id, ProductInput input, long userId) {
        validate(input);
        int changed = jdbc.update("""
                UPDATE investment_products SET name = ?, description = ?, minimum_amount = ?, maximum_amount = ?,
                    minimum_term_days = ?, maximum_term_days = ?, term_unit = ?, term_selection = ?,
                    minimum_term_value = ?, maximum_term_value = ?, term_increment = ?, calculation_method = ?, rate_type = ?,
                    capitalization_frequency = ?, calendar_mode = ?, day_count_basis = ?, withholding_rate = ?, active = ?,
                    updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?
                """, input.name().trim(), normalizedDescription(input.description()), input.minimumAmount(),
                input.maximumAmount(), input.minimumTermDays(), input.maximumTermDays(), input.termUnit(),
                input.termSelection(), input.minimumTermValue(), input.maximumTermValue(), input.termIncrement(),
                input.calculationMethod(), input.rateType(), input.capitalizationFrequency(), input.calendarMode(), input.dayCountBasis(), BigDecimal.ZERO,
                input.active(), userId, id);
        if (changed == 0) throw new NoSuchElementException("No se encontró el producto de inversión.");
        replaceChildren(id, input);
        return productById(id, false);
    }

    @Transactional
    public Product changeStatus(long id, boolean active, long userId) {
        int changed = jdbc.update("UPDATE investment_products SET active = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?",
                active, userId, id);
        if (changed == 0) throw new NoSuchElementException("No se encontró el producto de inversión.");
        return productById(id, false);
    }

    public SimulationResult simulate(SimulationRequest request) {
        Product product = productById(request.productId(), true);
        if (request.amount() == null || request.amount().compareTo(product.minimumAmount()) < 0
                || request.amount().compareTo(product.maximumAmount()) > 0) {
            throw new IllegalArgumentException("El monto está fuera del rango permitido para el producto.");
        }
        int termDays = termDays(request.termDays(), product.termUnit());
        boolean validTerm = product.termSelection().equals("RANGE")
                ? request.termDays() >= product.minimumTermValue()
                    && request.termDays() <= product.maximumTermValue()
                    && (request.termDays() - product.minimumTermValue()) % product.termIncrement() == 0
                : product.terms().contains(request.termDays());
        if (!validTerm) {
            throw new IllegalArgumentException("Selecciona uno de los plazos disponibles para el producto.");
        }
        if (!product.payoutFrequencies().contains(request.payoutFrequency())) {
            throw new IllegalArgumentException("Selecciona una forma de pago permitida para el producto.");
        }
        RateTier rate = product.rates().stream()
                .filter(item -> request.amount().compareTo(item.minimumAmount()) >= 0
                        && request.amount().compareTo(item.maximumAmount()) <= 0
                        && request.termDays() >= item.minimumTermValue()
                        && request.termDays() <= item.maximumTermValue())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No existe una tasa configurada para la combinación de monto y plazo."));
        LocalDate today = LocalDate.now();
        List<InvestmentCalculator.TaxRule> taxRules = product.taxRules().stream()
                .map(rule -> new InvestmentCalculator.TaxRule(rule.ruleType(), rule.value(), rule.base(), rule.active()))
                .toList();
        InvestmentCalculator.Projection projection = calculator.calculate(request.amount(), rate.annualRate(),
                termDays, product.dayCountBasis(), product.withholdingRate(), request.payoutFrequency(),
                product.calculationMethod(), product.rateType(), product.capitalizationFrequency(), today, taxRules,
                product.calendarMode());
        String reference = "INV-" + today.toString().replace("-", "") + "-" + product.id() + "-" + request.termDays();
        return new SimulationResult(reference, today, product.id(), product.name(), product.currency(), request.amount(),
                termDays, rate.label(), request.termDays(), product.termUnit(), rate.annualRate(), product.calculationMethod(), product.rateType(),
                request.payoutFrequency(), product.capitalizationFrequency(), product.dayCountBasis(),
                product.withholdingRate(), projection.grossInterest(), projection.withholding(),
                projection.netInterest(), projection.maturityValue(), projection.maturityDate(), projection.payments());
    }

    private int termDays(int value, String unit) {
        if (value <= 0) throw new IllegalArgumentException("El plazo debe ser mayor que cero.");
        LocalDate start = LocalDate.now();
        return switch (unit) {
            case "MONTHS" -> Math.toIntExact(ChronoUnit.DAYS.between(start, start.plusMonths(value)));
            case "YEARS" -> Math.toIntExact(ChronoUnit.DAYS.between(start, start.plusYears(value)));
            default -> value;
        };
    }

    private Product productById(long id, boolean activeOnly) {
        String sql = """
                SELECT id, name, description, currency, minimum_amount, maximum_amount,
                       minimum_term_days, maximum_term_days, term_unit, term_selection,
                       minimum_term_value, maximum_term_value, term_increment, calculation_method, rate_type,
                       capitalization_frequency, calendar_mode, day_count_basis, withholding_rate, active,
                       created_at, updated_at
                FROM investment_products WHERE id = ?
                """ + (activeOnly ? " AND active = TRUE" : "");
        List<Product> products = jdbc.query(sql, (rs, row) -> product(rs, id), id);
        if (products.isEmpty()) throw new NoSuchElementException("No se encontró el producto de inversión.");
        return products.getFirst();
    }

    private void replaceChildren(long productId, ProductInput input) {
        jdbc.update("DELETE FROM investment_product_terms WHERE product_id = ?", productId);
        for (int index = 0; index < input.terms().size(); index++) {
            int visibleTerm = input.terms().get(index);
            jdbc.update("INSERT INTO investment_product_terms (product_id, term_days, term_value, position) VALUES (?, ?, ?, ?)",
                    productId, termDays(visibleTerm, input.termUnit()), visibleTerm, index);
        }
        jdbc.update("DELETE FROM investment_product_payout_frequencies WHERE product_id = ?", productId);
        for (int index = 0; index < input.payoutFrequencies().size(); index++) {
            jdbc.update("INSERT INTO investment_product_payout_frequencies (product_id, frequency, position) VALUES (?, ?, ?)",
                    productId, input.payoutFrequencies().get(index), index);
        }
        jdbc.update("DELETE FROM investment_product_rates WHERE product_id = ?", productId);
        for (int index = 0; index < input.rates().size(); index++) {
            RateInput rate = input.rates().get(index);
            jdbc.update("""
                    INSERT INTO investment_product_rates (
                        product_id, label, minimum_amount, maximum_amount,
                        minimum_term_days, maximum_term_days, minimum_term_value,
                        maximum_term_value, annual_rate, position
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, productId, rate.label().trim(), rate.minimumAmount(), rate.maximumAmount(),
                    termDays(rate.minimumTermValue(), input.termUnit()), termDays(rate.maximumTermValue(), input.termUnit()),
                    rate.minimumTermValue(), rate.maximumTermValue(), rate.annualRate(), index);
        }
        jdbc.update("DELETE FROM investment_product_tax_rules WHERE product_id = ?", productId);
        if (input.taxRules() != null) {
            for (int index = 0; index < input.taxRules().size(); index++) {
                TaxRule rule = input.taxRules().get(index);
                jdbc.update("""
                        INSERT INTO investment_product_tax_rules
                        (product_id, name, rule_type, value, base, active, position)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, productId, rule.name().trim(), rule.ruleType(), rule.value(),
                        rule.base(), rule.active(), index);
            }
        }
    }

    private void validate(ProductInput input) {
        if (input == null || input.name() == null || input.name().isBlank() || input.name().trim().length() > 120)
            throw new IllegalArgumentException("Ingresa un nombre de producto válido.");
        if (normalizedDescription(input.description()).length() > 600)
            throw new IllegalArgumentException("La descripción no puede superar 600 caracteres.");
        if (input.minimumAmount() == null || input.maximumAmount() == null || input.minimumAmount().signum() <= 0
                || input.maximumAmount().compareTo(input.minimumAmount()) < 0)
            throw new IllegalArgumentException("El rango de montos no es válido.");
        if (!Set.of("DAYS", "MONTHS", "YEARS").contains(input.termUnit())
                || !Set.of("PREDEFINED", "RANGE").contains(input.termSelection())
                || input.minimumTermValue() == null || input.maximumTermValue() == null
                || input.termIncrement() == null || input.minimumTermValue() <= 0
                || input.maximumTermValue() < input.minimumTermValue() || input.termIncrement() <= 0)
            throw new IllegalArgumentException("Configura un rango de plazos válido.");
        if (!Set.of("FIXED_DAYS", "CALENDAR").contains(input.calendarMode()))
            throw new IllegalArgumentException("Selecciona una modalidad de calendario válida.");
        List<Integer> terms = input.terms() == null ? List.of() : input.terms();
        if ("PREDEFINED".equals(input.termSelection())
                && (terms.isEmpty() || terms.stream().anyMatch(term -> term == null || term <= 0)
                || terms.stream().distinct().count() != terms.size()))
            throw new IllegalArgumentException("Configura plazos concretos y no repetidos.");
        int expectedMinimumDays = termDays(input.minimumTermValue(), input.termUnit());
        int expectedMaximumDays = termDays(input.maximumTermValue(), input.termUnit());
        if (input.minimumTermDays() != expectedMinimumDays || input.maximumTermDays() != expectedMaximumDays)
            throw new IllegalArgumentException("El rango de plazos no coincide con la unidad seleccionada.");
        if ("PREDEFINED".equals(input.termSelection())) {
            int minTerm = terms.stream().min(Integer::compareTo).orElseThrow();
            int maxTerm = terms.stream().max(Integer::compareTo).orElseThrow();
            if (input.minimumTermValue() != minTerm || input.maximumTermValue() != maxTerm)
                throw new IllegalArgumentException("El rango de plazos debe coincidir con los plazos configurados.");
        }
        if (!CALCULATION_METHODS.contains(input.calculationMethod()) || !RATE_TYPES.contains(input.rateType()))
            throw new IllegalArgumentException("El método o tipo de tasa no es válido.");
        if ("COMPOUND".equals(input.calculationMethod())
                && !CAPITALIZATION_FREQUENCIES.contains(input.capitalizationFrequency()))
            throw new IllegalArgumentException("Configura una frecuencia de capitalización válida.");
        if ("SIMPLE".equals(input.calculationMethod()) && input.capitalizationFrequency() != null)
            throw new IllegalArgumentException("Los productos simples no requieren capitalización.");
        if (input.dayCountBasis() != 360 && input.dayCountBasis() != 365)
            throw new IllegalArgumentException("La base anual debe ser de 360 o 365 días.");
        if (input.withholdingRate() == null || input.withholdingRate().signum() < 0
                || input.withholdingRate().compareTo(BigDecimal.ONE) > 0)
            throw new IllegalArgumentException("La retención debe estar entre 0 % y 100 %.");
        if (input.payoutFrequencies() == null || input.payoutFrequencies().isEmpty()
                || !PAYOUT_FREQUENCIES.containsAll(input.payoutFrequencies()))
            throw new IllegalArgumentException("Configura al menos una frecuencia de pago válida.");
        if ("COMPOUND".equals(input.calculationMethod())
                && !(input.payoutFrequencies().size() == 1 && input.payoutFrequencies().contains("AT_MATURITY")))
            throw new IllegalArgumentException("Los productos compuestos solo pueden pagar al vencimiento.");
        if (input.rates() == null || input.rates().isEmpty())
            throw new IllegalArgumentException("Configura al menos un rango de tasa.");

        List<RateInput> checked = new ArrayList<>();
        Set<String> labels = new HashSet<>();
        for (RateInput rate : input.rates()) {
            if (rate == null || rate.label() == null || rate.label().isBlank() || rate.label().trim().length() > 100
                    || rate.minimumAmount() == null || rate.maximumAmount() == null
                    || rate.minimumAmount().compareTo(input.minimumAmount()) < 0
                    || rate.maximumAmount().compareTo(input.maximumAmount()) > 0
                    || rate.maximumAmount().compareTo(rate.minimumAmount()) < 0
                    || rate.minimumTermValue() <= 0 || rate.maximumTermValue() < rate.minimumTermValue()
                    || rate.minimumTermValue() < input.minimumTermValue() || rate.maximumTermValue() > input.maximumTermValue()
                    || ("PREDEFINED".equals(input.termSelection())
                        && (rate.minimumTermValue() != rate.maximumTermValue()
                            || !terms.contains(rate.minimumTermValue())))
                    || rate.annualRate() == null || rate.annualRate().signum() <= 0
                    || rate.annualRate().compareTo(BigDecimal.ONE) > 0)
                throw new IllegalArgumentException("Cada tasa debe corresponder a un plazo y rango válido.");
            if (!labels.add(rate.label().trim().toLowerCase(Locale.ROOT)))
                throw new IllegalArgumentException("Los nombres de los rangos de tasa no pueden repetirse.");
            for (RateInput previous : checked) {
                boolean amountsOverlap = rate.minimumAmount().compareTo(previous.maximumAmount()) <= 0
                        && previous.minimumAmount().compareTo(rate.maximumAmount()) <= 0;
                boolean termsOverlap = rate.minimumTermValue() <= previous.maximumTermValue()
                        && previous.minimumTermValue() <= rate.maximumTermValue();
                if (termsOverlap && amountsOverlap)
                    throw new IllegalArgumentException("Existen rangos de tasa superpuestos.");
            }
            checked.add(rate);
        }
        if (input.taxRules() != null) {
            for (TaxRule rule : input.taxRules()) {
                if (rule == null || rule.name() == null || rule.name().isBlank() || rule.value() == null
                        || rule.value().signum() < 0 || !Set.of("PERCENTAGE", "FIXED").contains(rule.ruleType())
                        || !Set.of("GROSS_INTEREST", "CAPITAL", "TOTAL").contains(rule.base()))
                    throw new IllegalArgumentException("Revisa las reglas fiscales configuradas.");
                if ("PERCENTAGE".equals(rule.ruleType()) && rule.value().compareTo(BigDecimal.valueOf(100)) > 0)
                    throw new IllegalArgumentException("Una regla porcentual no puede superar el 100 %.");
            }
        }
    }

    private String normalizedDescription(String description) {
        return description == null ? "" : description.trim();
    }
}
