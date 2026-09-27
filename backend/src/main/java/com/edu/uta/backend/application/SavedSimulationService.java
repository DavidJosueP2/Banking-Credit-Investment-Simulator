package com.edu.uta.backend.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import com.edu.uta.backend.identity.IdentityService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedSimulationService {

    private static final int MAX_PER_CUSTOMER = 100;

    private final JdbcTemplate jdbc;
    private final ScenarioCalculator calculator;
    private final IdentityService identity;

    public SavedSimulationService(JdbcTemplate jdbc, ScenarioCalculator calculator, IdentityService identity) {
        this.jdbc = jdbc;
        this.calculator = calculator;
        this.identity = identity;
    }

    public record SaveInput(String productType, Long productId, BigDecimal amount, Integer term,
                            String amortizationSystem, String payoutFrequency, BigDecimal assetCost, String label,
                            List<Long> optionalCharges, String termUnit) {}

    public record SavedSimulation(long id, String productType, long productId, String productName, String label,
                                  BigDecimal amount, int term, String termUnit, String amortizationSystem,
                                  String payoutFrequency, BigDecimal assetCost, BigDecimal annualRate,
                                  BigDecimal periodicPayment, BigDecimal totalInterest, BigDecimal totalAmount,
                                  List<Long> optionalCharges, OffsetDateTime createdAt) {}

    public List<SavedSimulation> list(String username) {
        return jdbc.query("""
                SELECT id, product_type, product_id, product_name, label, amount, term, term_unit,
                       amortization_system, payout_frequency, asset_cost, annual_rate, periodic_payment,
                       total_interest, total_amount, optional_charges, created_at
                FROM saved_simulations WHERE user_id = ? ORDER BY created_at DESC, id DESC
                """, (rs, row) -> new SavedSimulation(rs.getLong("id"), rs.getString("product_type"),
                rs.getLong("product_id"), rs.getString("product_name"), rs.getString("label"),
                rs.getBigDecimal("amount"), rs.getInt("term"), rs.getString("term_unit"),
                rs.getString("amortization_system"), rs.getString("payout_frequency"),
                rs.getBigDecimal("asset_cost"), rs.getBigDecimal("annual_rate"),
                rs.getBigDecimal("periodic_payment"), rs.getBigDecimal("total_interest"),
                rs.getBigDecimal("total_amount"),
                ScenarioCalculator.parseOptionalCharges(rs.getString("optional_charges")),
                rs.getObject("created_at", OffsetDateTime.class)),
                userId(username));
    }

    /** El resultado se vuelve a calcular en el servidor: nunca se guardan cifras enviadas por el navegador. */
    @Transactional
    public SavedSimulation save(String username, SaveInput input) {
        long userId = userId(username);
        Integer count = jdbc.queryForObject("SELECT count(*) FROM saved_simulations WHERE user_id = ?",
                Integer.class, userId);
        if (count != null && count >= MAX_PER_CUSTOMER) {
            throw new IllegalStateException("Puedes guardar hasta " + MAX_PER_CUSTOMER
                    + " simulaciones. Elimina alguna para guardar otra.");
        }
        ScenarioCalculator.Quote quote = calculator.quote(new ScenarioCalculator.Scenario(input.productType(),
                input.productId(), input.amount(), input.term(), input.amortizationSystem(),
                input.payoutFrequency(), input.assetCost(), input.optionalCharges(), input.termUnit()));
        String label = input.label() == null || input.label().isBlank() ? null : input.label().trim();
        if (label != null && label.length() > 80) {
            throw new IllegalArgumentException("El nombre de la simulación admite hasta 80 caracteres.");
        }
        Long id = jdbc.queryForObject("""
                INSERT INTO saved_simulations (user_id, product_type, product_id, product_name, label, amount, term,
                    term_unit, amortization_system, payout_frequency, asset_cost, annual_rate, periodic_payment,
                    total_interest, total_amount, optional_charges)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, userId, quote.productType(), quote.productId(), quote.productName(), label,
                quote.amount(), quote.term(), quote.termUnit(), quote.amortizationSystem(), quote.payoutFrequency(),
                quote.assetCost(), quote.annualRate(), quote.periodicPayment(), quote.totalInterest(),
                quote.totalAmount(), quote.optionalChargesCsv());
        return list(username).stream().filter(item -> item.id() == id).findFirst().orElseThrow();
    }

    @Transactional
    public void delete(String username, long id) {
        int removed = jdbc.update("DELETE FROM saved_simulations WHERE id = ? AND user_id = ?", id, userId(username));
        if (removed == 0) throw new NoSuchElementException("No encontramos la simulación.");
    }

    private long userId(String username) {
        return identity.accountByUsername(username).id();
    }
}
