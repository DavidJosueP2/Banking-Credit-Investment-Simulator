package com.edu.uta.backend.investment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvestmentService {
    private static final int MINIMUM_FIXED_TERM_DAYS = 31;

    private static final Set<String> PAYOUT_FREQUENCIES = Set.of(
            "AT_MATURITY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL");
    private static final Set<String> CALCULATION_METHODS = Set.of("SIMPLE", "COMPOUND");
    private static final Set<String> CAPITALIZATION_FREQUENCIES = Set.of(
            "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL");
    private static final int MAXIMUM_CHARGES = 10;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final JdbcTemplate jdbc;
    private final InvestmentCalculator calculator;

    public InvestmentService(JdbcTemplate jdbc, InvestmentCalculator calculator) {
        this.jdbc = jdbc;
        this.calculator = calculator;
    }

    public record RateTier(Long id, String label, BigDecimal minimumAmount, BigDecimal maximumAmount,
            int minimumTermDays, int maximumTermDays, int minimumTermValue, int maximumTermValue,
            BigDecimal annualRate, int position) {}
    public record TaxRule(Long id, String name, String ruleType, BigDecimal value, String base, boolean active,
            Integer exemptFromTermDays, int position) {}
    public record TaxRuleInput(String name, String ruleType, BigDecimal value, String base, boolean active,
            Integer exemptFromTermDays) {}
    public record WithholdingDetail(String name, BigDecimal percentage, BigDecimal amount) {}
    /** Costo adicional de la institución; independiente de la retención de Impuesto a la Renta. */
    /** {@code description}: qué cubre o a qué se destina; obligatoria en los opcionales para que el cliente decida. */
    /** {@code percentage}: porcentaje del interés generado que se descuenta en cada pago de intereses. */
    public record ProductCharge(Long id, String name, BigDecimal percentage, boolean mandatory, boolean active,
            int position, String description) {}
    public record ChargeInput(String name, BigDecimal percentage, boolean mandatory, boolean active,
            String description) {}
    public record ChargeDetail(long id, String name, BigDecimal percentage, boolean mandatory, BigDecimal amount,
            String description) {}
    public record TermConfiguration(String unit, String selection, int minimumValue, int maximumValue,
            int increment, List<Integer> options) {}

    public record Product(Long id, String name, String description, String currency,
            BigDecimal minimumAmount, BigDecimal maximumAmount, int minimumTermDays, int maximumTermDays,
            String termUnit, String termSelection, int minimumTermValue, int maximumTermValue, int termIncrement,
            String calculationMethod, String rateType, String capitalizationFrequency, String calendarMode, int dayCountBasis,
            BigDecimal withholdingRate, boolean active, OffsetDateTime createdAt, OffsetDateTime updatedAt,
            List<Integer> terms, List<String> payoutFrequencies, List<RateTier> rates, List<TaxRule> taxRules,
            List<TermConfiguration> termConfigurations, List<ProductCharge> charges) {}

    public record RateInput(String label, BigDecimal minimumAmount, BigDecimal maximumAmount,
            int minimumTermDays, int maximumTermDays, int minimumTermValue, int maximumTermValue,
            BigDecimal annualRate) {}

    public record ProductInput(String name, String description, BigDecimal minimumAmount,
            BigDecimal maximumAmount, int minimumTermDays, int maximumTermDays, String calculationMethod,
            String rateType, String capitalizationFrequency, String calendarMode, int dayCountBasis, BigDecimal withholdingRate,
            boolean active, List<Integer> terms, List<String> payoutFrequencies, List<RateInput> rates,
            String termUnit, String termSelection, Integer minimumTermValue, Integer maximumTermValue,
            Integer termIncrement, List<TaxRuleInput> taxRules, List<TermConfiguration> termConfigurations,
            List<ChargeInput> charges) {}

    /** {@code optionalCharges}: costos opcionales del plan que el cliente decidió agregar. */
    public record SimulationRequest(long productId, BigDecimal amount, Integer termValue, String termUnit,
            String payoutFrequency, List<Long> optionalCharges) {
        public SimulationRequest(long productId, BigDecimal amount, Integer termValue, String termUnit,
                String payoutFrequency) {
            this(productId, amount, termValue, termUnit, payoutFrequency, List.of());
        }
    }

    /**
     * {@code netAnnualYield}: rendimiento anual que realmente recibe el cliente después de retención y costos,
     * expresado igual que la tasa ofrecida (nominal para interés simple, efectiva para compuesto).
     */
    public record SimulationResult(String reference, LocalDate simulationDate, long productId,
            String productName, String currency, BigDecimal amount, int termDays, int normalizedTermDays, String rateLabel,
            int termValue, String termUnit,
            BigDecimal annualRate, String calculationMethod, String rateType, String payoutFrequency,
            String capitalizationFrequency, int dayCountBasis, BigDecimal withholdingRate,
            BigDecimal grossInterest, BigDecimal withholding, BigDecimal netInterest,
            BigDecimal maturityValue, LocalDate maturityDate, List<WithholdingDetail> withholdingDetails,
            String withholdingNote, List<InvestmentCalculator.Payment> payments, BigDecimal charges,
            List<ChargeDetail> chargeDetails, BigDecimal netAnnualYield) {}

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
                termsFor(id), payoutFrequenciesFor(id), ratesFor(id), taxRulesFor(id), termConfigurationsFor(id),
                chargesFor(id));
    }

    private List<ProductCharge> chargesFor(long productId) {
        return jdbc.query("""
                SELECT id, name, value, mandatory, active, position, description
                FROM investment_product_charges WHERE product_id = ? ORDER BY position, id
                """, (rs, row) -> new ProductCharge(rs.getLong("id"), rs.getString("name"),
                rs.getBigDecimal("value"), rs.getBoolean("mandatory"), rs.getBoolean("active"),
                rs.getInt("position"), rs.getString("description")), productId);
    }

    private List<Integer> termsFor(long productId) {
        return jdbc.queryForList("SELECT term_value FROM investment_product_terms WHERE product_id = ? ORDER BY position, term_value",
                Integer.class, productId);
    }

    private List<String> payoutFrequenciesFor(long productId) {
        return jdbc.queryForList("SELECT frequency FROM investment_product_payout_frequencies WHERE product_id = ? ORDER BY position, frequency",
                String.class, productId);
    }

    private List<TermConfiguration> termConfigurationsFor(long productId) {
        return jdbc.query("""
                SELECT id, unit, selection, minimum_value, maximum_value, increment_value
                FROM investment_product_term_configs WHERE product_id = ? ORDER BY position, id
                """, (rs, row) -> {
            long configId = rs.getLong("id");
            List<Integer> options = jdbc.queryForList("""
                    SELECT value FROM investment_product_term_options
                    WHERE config_id = ? ORDER BY position, value
                    """, Integer.class, configId);
            return new TermConfiguration(rs.getString("unit"), rs.getString("selection"),
                    rs.getInt("minimum_value"), rs.getInt("maximum_value"),
                    rs.getInt("increment_value"), options);
        }, productId);
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
                SELECT id, name, rule_type, value, base, active, exempt_from_term_days, position
                FROM investment_product_tax_rules WHERE product_id = ? ORDER BY position, id
                """, (rs, row) -> new TaxRule(rs.getLong("id"), rs.getString("name"),
                rs.getString("rule_type"), rs.getBigDecimal("value"), rs.getString("base"),
                rs.getBoolean("active"), (Integer) rs.getObject("exempt_from_term_days"),
                rs.getInt("position")), productId);
    }

    @Transactional
    public Product create(ProductInput input, long userId) {
        validate(input);
        TermConfiguration primary = input.termConfigurations().getFirst();
        Long id = jdbc.queryForObject("""
                INSERT INTO investment_products (
                    name, description, currency, minimum_amount, maximum_amount, minimum_term_days,
                    maximum_term_days, term_unit, term_selection, minimum_term_value, maximum_term_value,
                    term_increment, calculation_method, rate_type, capitalization_frequency,
                    calendar_mode, day_count_basis, withholding_rate, active, updated_by
                ) VALUES (?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, input.name().trim(), normalizedDescription(input.description()),
                input.minimumAmount(), input.maximumAmount(), input.minimumTermDays(), input.maximumTermDays(),
                primary.unit(), primary.selection(), primary.minimumValue(), primary.maximumValue(),
                primary.increment(),
                input.calculationMethod(), automaticRateType(input.calculationMethod()), input.capitalizationFrequency(), "FIXED_DAYS", input.dayCountBasis(),
                BigDecimal.ZERO, input.active(), userId);
        replaceChildren(id, input);
        return productById(id, false);
    }

    @Transactional
    public Product update(long id, ProductInput input, long userId) {
        validate(input);
        TermConfiguration primary = input.termConfigurations().getFirst();
        int changed = jdbc.update("""
                UPDATE investment_products SET name = ?, description = ?, minimum_amount = ?, maximum_amount = ?,
                    minimum_term_days = ?, maximum_term_days = ?, term_unit = ?, term_selection = ?,
                    minimum_term_value = ?, maximum_term_value = ?, term_increment = ?, calculation_method = ?, rate_type = ?,
                    capitalization_frequency = ?, calendar_mode = ?, day_count_basis = ?, withholding_rate = ?, active = ?,
                    updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?
                """, input.name().trim(), normalizedDescription(input.description()), input.minimumAmount(),
                input.maximumAmount(), input.minimumTermDays(), input.maximumTermDays(), primary.unit(),
                primary.selection(), primary.minimumValue(), primary.maximumValue(), primary.increment(),
                input.calculationMethod(), automaticRateType(input.calculationMethod()), input.capitalizationFrequency(), "FIXED_DAYS", input.dayCountBasis(), BigDecimal.ZERO,
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
            throw new IllegalArgumentException("El monto está fuera del rango permitido para este plan.");
        }
        if (request.termValue() == null || request.termValue() <= 0 || request.termUnit() == null) {
            throw new IllegalArgumentException("Selecciona una unidad y un plazo válidos.");
        }
        int normalizedTermDays = normalizedTermDays(request.termValue(), request.termUnit());
        // Un mismo plazo usa los días reales del calendario para todo (tramo de tasa, límites, interés y exención):
        // 2 meses desde el 27 de septiembre son 61 días y caen en el tramo de 61–90 días.
        LocalDate today = LocalDate.now();
        LocalDate maturityDate = maturityDate(today, request.termValue(), request.termUnit());
        int actualTermDays = Math.toIntExact(ChronoUnit.DAYS.between(today, maturityDate));
        if (actualTermDays < MINIMUM_FIXED_TERM_DAYS) {
            throw new IllegalArgumentException("El plazo mínimo para un depósito a plazo fijo es de 31 días.");
        }
        if (actualTermDays < product.minimumTermDays() || actualTermDays > product.maximumTermDays()) {
            throw new IllegalArgumentException("El plazo equivale a " + actualTermDays
                    + " días y este plan admite entre " + product.minimumTermDays() + " y "
                    + product.maximumTermDays() + " días.");
        }
        if (!product.payoutFrequencies().contains(request.payoutFrequency())
                || !isFrequencyCompatible(request.payoutFrequency(), normalizedTermDays)) {
            throw new IllegalArgumentException("Selecciona una forma de pago permitida para este plan.");
        }
        RateTier rate = product.rates().stream()
                .filter(item -> request.amount().compareTo(item.minimumAmount()) >= 0
                        && request.amount().compareTo(item.maximumAmount()) <= 0
                        && actualTermDays >= item.minimumTermDays()
                        && actualTermDays <= item.maximumTermDays())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No existe una tasa configurada para la combinación de monto y plazo."));
        List<TaxRule> applicableWithholdings = product.taxRules().stream()
                .filter(TaxRule::active)
                .filter(rule -> rule.exemptFromTermDays() == null || actualTermDays < rule.exemptFromTermDays())
                .toList();
        List<InvestmentCalculator.TaxRule> taxRules = applicableWithholdings.stream()
                .map(rule -> new InvestmentCalculator.TaxRule(rule.ruleType(), rule.value(), rule.base(), rule.active()))
                .toList();
        List<Long> requestedOptional = request.optionalCharges() == null ? List.of() : request.optionalCharges();
        List<ProductCharge> appliedCharges = product.charges().stream()
                .filter(ProductCharge::active)
                .filter(charge -> charge.mandatory() || requestedOptional.contains(charge.id()))
                .toList();
        List<InvestmentCalculator.Charge> calculatorCharges = appliedCharges.stream()
                .map(charge -> new InvestmentCalculator.Charge(charge.id(), charge.name(), charge.percentage()))
                .toList();
        InvestmentCalculator.Projection projection = calculator.calculate(request.amount(), rate.annualRate(),
                actualTermDays, product.dayCountBasis(), product.withholdingRate(), request.payoutFrequency(),
                product.calculationMethod(), product.rateType(), product.capitalizationFrequency(), today, taxRules,
                "DAYS".equals(request.termUnit()) ? "FIXED_DAYS" : "CALENDAR", calculatorCharges);
        validateCharges(projection);
        String unitReference = switch (request.termUnit()) {
            case "MONTHS" -> "M";
            case "YEARS" -> "Y";
            default -> "D";
        };
        String reference = "INV-" + today.toString().replace("-", "") + "-" + product.id()
                + "-" + request.termValue() + unitReference;
        List<WithholdingDetail> withholdingDetails = applicableWithholdings.stream()
                .map(rule -> new WithholdingDetail(rule.name(), rule.value(), projection.withholding()))
                .toList();
        String withholdingNote = withholdingNote(product.taxRules(), applicableWithholdings, actualTermDays);
        List<ChargeDetail> chargeDetails = new ArrayList<>();
        for (int index = 0; index < appliedCharges.size(); index++) {
            ProductCharge charge = appliedCharges.get(index);
            chargeDetails.add(new ChargeDetail(charge.id(), charge.name(), charge.percentage(), charge.mandatory(),
                    projection.chargeDetails().get(index).amount(), charge.description()));
        }
        BigDecimal netAnnualYield = netAnnualYield(request.amount(), projection.maturityValue(), actualTermDays,
                product.dayCountBasis(), product.calculationMethod());
        return new SimulationResult(reference, today, product.id(), product.name(), product.currency(), request.amount(),
                actualTermDays, normalizedTermDays, rate.label(), request.termValue(), request.termUnit(), rate.annualRate(), product.calculationMethod(), product.rateType(),
                request.payoutFrequency(), product.capitalizationFrequency(), product.dayCountBasis(),
                product.withholdingRate(), projection.grossInterest(), projection.withholding(),
                projection.netInterest(), projection.maturityValue(), projection.maturityDate(), withholdingDetails,
                withholdingNote, projection.payments(), projection.charges(), List.copyOf(chargeDetails), netAnnualYield);
    }

    /**
     * Los costos no pueden comerse el capital: en cada pago intermedio deben caber en el interés neto del período
     * y en total no pueden superar el interés neto del plazo.
     */
    private void validateCharges(InvestmentCalculator.Projection projection) {
        if (projection.charges().signum() == 0) return;
        boolean negativePayment = projection.payments().stream()
                .anyMatch(payment -> payment.totalPayment().signum() < 0);
        if (negativePayment || projection.charges().compareTo(projection.netInterest()) > 0) {
            throw new IllegalArgumentException(String.format(java.util.Locale.ROOT,
                    "Los costos adicionales ($%.2f) superan el rendimiento neto ($%.2f) para este monto y plazo. "
                            + "Aumenta el monto o el plazo, o quita los costos opcionales.",
                    projection.charges(), projection.netInterest()));
        }
    }

    /**
     * Rendimiento anual neto: lo que gana el cliente sobre su capital, llevado a un año. Para interés simple se
     * anualiza proporcionalmente (comparable con la tasa nominal); para compuesto, de forma exponencial
     * (comparable con la tasa efectiva).
     */
    private BigDecimal netAnnualYield(BigDecimal principal, BigDecimal maturityValue, int termDays, int basis,
            String calculationMethod) {
        double growth = maturityValue.doubleValue() / principal.doubleValue();
        double years = termDays / (double) basis;
        double yield = "COMPOUND".equals(calculationMethod)
                ? Math.pow(growth, 1 / years) - 1
                : (growth - 1) / years;
        return BigDecimal.valueOf(yield).setScale(6, java.math.RoundingMode.HALF_UP);
    }

    private String withholdingNote(List<TaxRule> configured, List<TaxRule> applicable, int termDays) {
        if (!applicable.isEmpty()) {
            TaxRule rule = applicable.getFirst();
            return rule.name() + ": " + rule.value().stripTrailingZeros().toPlainString()
                    + "% sobre los intereses generados.";
        }
        return configured.stream().filter(TaxRule::active)
                .filter(rule -> rule.exemptFromTermDays() != null && termDays >= rule.exemptFromTermDays())
                .findFirst()
                .map(rule -> "Sin retención estimada: el plazo alcanza el umbral de exención configurado de "
                        + rule.exemptFromTermDays() + " días, sujeto al cumplimiento de los requisitos legales.")
                .orElse("No se configuró una retención para este producto.");
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

    private int normalizedTermDays(int value, String unit) {
        if (value <= 0) throw new IllegalArgumentException("El plazo debe ser mayor que cero.");
        return switch (unit) {
            case "MONTHS" -> Math.multiplyExact(value, 30);
            case "YEARS" -> Math.multiplyExact(value, 360);
            case "DAYS" -> value;
            default -> throw new IllegalArgumentException("La unidad del plazo no es válida.");
        };
    }

    private LocalDate maturityDate(LocalDate start, int value, String unit) {
        return switch (unit) {
            case "MONTHS" -> start.plusMonths(value);
            case "YEARS" -> start.plusYears(value);
            case "DAYS" -> start.plusDays(value);
            default -> throw new IllegalArgumentException("La unidad del plazo no es válida.");
        };
    }

    private int minimumFrequencyDays(String frequency) {
        return switch (frequency) {
            case "MONTHLY" -> 30;
            case "BIMONTHLY" -> 60;
            case "QUARTERLY" -> 90;
            case "SEMIANNUAL" -> 180;
            case "ANNUAL" -> 360;
            default -> 0;
        };
    }

    private boolean isFrequencyCompatible(String frequency, int normalizedDays) {
        int frequencyDays = minimumFrequencyDays(frequency);
        return frequencyDays == 0 || (normalizedDays >= frequencyDays && normalizedDays % frequencyDays == 0);
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
        jdbc.update("DELETE FROM investment_product_term_configs WHERE product_id = ?", productId);
        List<TermConfiguration> configurations = input.termConfigurations();
        for (int configIndex = 0; configIndex < configurations.size(); configIndex++) {
            TermConfiguration config = configurations.get(configIndex);
            Long configId = jdbc.queryForObject("""
                    INSERT INTO investment_product_term_configs
                    (product_id, unit, selection, minimum_value, maximum_value, increment_value, position)
                    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
                    """, Long.class, productId, config.unit(), config.selection(), config.minimumValue(),
                    config.maximumValue(), config.increment(), configIndex);
            for (int optionIndex = 0; optionIndex < config.options().size(); optionIndex++) {
                jdbc.update("""
                        INSERT INTO investment_product_term_options (config_id, value, position)
                        VALUES (?, ?, ?)
                        """, configId, config.options().get(optionIndex), optionIndex);
            }
        }
        jdbc.update("DELETE FROM investment_product_terms WHERE product_id = ?", productId);
        TermConfiguration primaryConfig = configurations.getFirst();
        List<Integer> legacyTerms = "PREDEFINED".equals(primaryConfig.selection())
                ? primaryConfig.options() : List.of(primaryConfig.minimumValue(), primaryConfig.maximumValue());
        for (int index = 0; index < legacyTerms.size(); index++) {
            int visibleTerm = legacyTerms.get(index);
            jdbc.update("INSERT INTO investment_product_terms (product_id, term_days, term_value, position) VALUES (?, ?, ?, ?)",
                    productId, normalizedTermDays(visibleTerm, primaryConfig.unit()), visibleTerm, index);
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
                    """, productId, rateLabel(rate.minimumTermDays(), rate.maximumTermDays()), rate.minimumAmount(), rate.maximumAmount(),
                    rate.minimumTermDays(), rate.maximumTermDays(),
                    rate.minimumTermDays(), rate.maximumTermDays(), rate.annualRate(), index);
        }
        jdbc.update("DELETE FROM investment_product_tax_rules WHERE product_id = ?", productId);
        if (input.taxRules() != null) {
            for (int index = 0; index < input.taxRules().size(); index++) {
                TaxRuleInput rule = input.taxRules().get(index);
                jdbc.update("""
                        INSERT INTO investment_product_tax_rules
                        (product_id, name, rule_type, value, base, active, exempt_from_term_days, position)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, productId, rule.name().trim(), rule.ruleType(), rule.value(),
                        rule.base(), rule.active(), rule.exemptFromTermDays(), index);
            }
        }
        jdbc.update("DELETE FROM investment_product_charges WHERE product_id = ?", productId);
        List<ChargeInput> charges = input.charges() == null ? List.of() : input.charges();
        for (int index = 0; index < charges.size(); index++) {
            ChargeInput charge = charges.get(index);
            jdbc.update("""
                    INSERT INTO investment_product_charges
                    (product_id, name, charge_type, value, base, frequency, mandatory, active, position, description)
                    VALUES (?, ?, 'PERCENTAGE', ?, 'GROSS_INTEREST', 'PER_PAYMENT', ?, ?, ?, ?)
                    """, productId, charge.name().trim(), charge.percentage(),
                    charge.mandatory(), charge.active(), index,
                    charge.description() == null || charge.description().isBlank() ? null : charge.description().trim());
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
        List<TermConfiguration> configurations = input.termConfigurations() == null
                ? List.of() : input.termConfigurations();
        if (configurations.size() != 1)
            throw new IllegalArgumentException("El plazo debe derivarse de una única configuración interna.");
        TermConfiguration internalConfiguration = configurations.getFirst();
        if (internalConfiguration == null || !"DAYS".equals(internalConfiguration.unit())
                || !"RANGE".equals(internalConfiguration.selection()) || internalConfiguration.minimumValue() < MINIMUM_FIXED_TERM_DAYS
                || internalConfiguration.maximumValue() < internalConfiguration.minimumValue()
                || internalConfiguration.increment() != 1)
            throw new IllegalArgumentException("La configuración interna del plazo no es válida.");
        int configuredMinimumDays = internalConfiguration.minimumValue();
        int configuredMaximumDays = internalConfiguration.maximumValue();
        if (input.minimumTermDays() != configuredMinimumDays || input.maximumTermDays() != configuredMaximumDays)
            throw new IllegalArgumentException("El resumen de plazos no coincide con las unidades configuradas.");
        if (!CALCULATION_METHODS.contains(input.calculationMethod()))
            throw new IllegalArgumentException("El método de cálculo no es válido.");
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
        for (RateInput rate : input.rates()) {
            if (rate == null || rate.label() == null || rate.label().isBlank() || rate.label().trim().length() > 100
                    || rate.minimumAmount() == null || rate.maximumAmount() == null
                    || rate.minimumAmount().compareTo(input.minimumAmount()) < 0
                    || rate.maximumAmount().compareTo(input.maximumAmount()) > 0
                    || rate.maximumAmount().compareTo(rate.minimumAmount()) < 0
                    || rate.minimumTermDays() <= 0 || rate.maximumTermDays() < rate.minimumTermDays()
                    || rate.minimumTermDays() < configuredMinimumDays || rate.maximumTermDays() > configuredMaximumDays
                    || rate.annualRate() == null || rate.annualRate().signum() <= 0
                    || rate.annualRate().compareTo(BigDecimal.ONE) > 0)
                throw new IllegalArgumentException("Cada tasa debe corresponder a un plazo y rango válido.");
            for (RateInput previous : checked) {
                boolean amountsOverlap = rate.minimumAmount().compareTo(previous.maximumAmount()) <= 0
                        && previous.minimumAmount().compareTo(rate.maximumAmount()) <= 0;
                boolean termsOverlap = rate.minimumTermDays() <= previous.maximumTermDays()
                        && previous.minimumTermDays() <= rate.maximumTermDays();
                if (termsOverlap && amountsOverlap)
                    throw new IllegalArgumentException("Existen rangos de tasa superpuestos.");
            }
            checked.add(rate);
        }
        validateRateCoverage(input, configurations);
        if (input.taxRules() != null) {
            if (input.taxRules().size() > 1)
                throw new IllegalArgumentException("Configura una sola retención de Impuesto a la Renta por producto.");
            for (TaxRuleInput rule : input.taxRules()) {
                if (rule == null || rule.name() == null || rule.name().isBlank() || rule.value() == null
                        || rule.name().trim().length() > 120
                        || rule.value().signum() <= 0 || !"PERCENTAGE".equals(rule.ruleType())
                        || !"GROSS_INTEREST".equals(rule.base()))
                    throw new IllegalArgumentException("La retención debe ser un porcentaje mayor que cero aplicado a los intereses.");
                if (rule.value().compareTo(BigDecimal.TEN) > 0)
                    throw new IllegalArgumentException("La retención no puede superar el 10 %.");
                if (rule.exemptFromTermDays() != null && rule.exemptFromTermDays() < 180)
                    throw new IllegalArgumentException("El umbral de exención no puede ser menor a 180 días.");
            }
        }
        validateCharges(input);
    }

    private void validateCharges(ProductInput input) {
        List<ChargeInput> charges = input.charges() == null ? List.of() : input.charges();
        if (charges.size() > MAXIMUM_CHARGES)
            throw new IllegalArgumentException("Configura como máximo " + MAXIMUM_CHARGES + " costos adicionales.");
        for (ChargeInput charge : charges) {
            if (charge == null || charge.name() == null || charge.name().isBlank() || charge.name().trim().length() > 120)
                throw new IllegalArgumentException("Cada costo adicional necesita un nombre de hasta 120 caracteres.");
            String description = charge.description() == null ? "" : charge.description().trim();
            if (!charge.mandatory() && description.isEmpty())
                throw new IllegalArgumentException("Explica al cliente qué incluye el costo opcional \"" + charge.name().trim() + "\".");
            if (description.length() > 300)
                throw new IllegalArgumentException("La descripción de \"" + charge.name().trim() + "\" no puede superar 300 caracteres.");
            if (charge.percentage() == null || charge.percentage().signum() <= 0)
                throw new IllegalArgumentException("El porcentaje de \"" + charge.name().trim() + "\" debe ser mayor que cero.");
        }
        // Con todos los costos activos (también los opcionales, por si el cliente los elige) y la retención, al
        // cliente le debe quedar parte del interés: así la simulación nunca falla por costos.
        BigDecimal chargesPercentage = charges.stream().filter(ChargeInput::active).map(ChargeInput::percentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal withholdingPercentage = input.taxRules() == null ? BigDecimal.ZERO : input.taxRules().stream()
                .filter(rule -> rule != null && rule.active() && rule.value() != null).map(TaxRuleInput::value)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (chargesPercentage.add(withholdingPercentage).compareTo(HUNDRED) >= 0)
            throw new IllegalArgumentException("Los costos (" + chargesPercentage.stripTrailingZeros().toPlainString()
                    + " %) y la retención (" + withholdingPercentage.stripTrailingZeros().toPlainString()
                    + " %) se llevarían todo el interés del cliente. Deben sumar menos del 100 %.");
    }

    private void validateRateCoverage(ProductInput input, List<TermConfiguration> configurations) {
        List<Integer> durations = new ArrayList<>();
        for (TermConfiguration config : configurations) {
            if ("PREDEFINED".equals(config.selection())) {
                config.options().forEach(value -> durations.add(normalizedTermDays(value, config.unit())));
            } else {
                long count = ((long) config.maximumValue() - config.minimumValue()) / config.increment() + 1;
                if (count > 10_000) {
                    durations.add(normalizedTermDays(config.minimumValue(), config.unit()));
                    durations.add(normalizedTermDays(config.maximumValue(), config.unit()));
                } else {
                    for (int value = config.minimumValue(); value <= config.maximumValue(); value += config.increment()) {
                        durations.add(normalizedTermDays(value, config.unit()));
                    }
                }
            }
        }
        for (int duration : durations.stream().distinct().toList()) {
            List<RateInput> applicable = input.rates().stream()
                    .filter(rate -> duration >= rate.minimumTermDays() && duration <= rate.maximumTermDays())
                    .sorted((left, right) -> left.minimumAmount().compareTo(right.minimumAmount()))
                    .toList();
            BigDecimal coveredUntil = input.minimumAmount().subtract(new BigDecimal("0.01"));
            for (RateInput rate : applicable) {
                if (rate.minimumAmount().compareTo(coveredUntil.add(new BigDecimal("0.01"))) > 0)
                    break;
                if (rate.maximumAmount().compareTo(coveredUntil) > 0) coveredUntil = rate.maximumAmount();
            }
            if (coveredUntil.compareTo(input.maximumAmount()) < 0)
                throw new IllegalArgumentException("Existe un plazo permitido sin cobertura completa de tasas: "
                        + duration + " días normalizados.");
        }
    }

    private String automaticRateType(String calculationMethod) {
        return "COMPOUND".equals(calculationMethod) ? "EFFECTIVE_ANNUAL" : "NOMINAL_ANNUAL";
    }

    private String rateLabel(int minimumDays, int maximumDays) {
        return minimumDays == maximumDays
                ? minimumDays + " días"
                : minimumDays + "–" + maximumDays + " días";
    }

    private String normalizedDescription(String description) {
        return description == null ? "" : description.trim();
    }
}
