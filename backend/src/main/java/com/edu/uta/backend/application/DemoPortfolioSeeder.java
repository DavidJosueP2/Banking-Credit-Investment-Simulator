package com.edu.uta.backend.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import com.edu.uta.backend.dto.ProductoSimuladorDto;
import com.edu.uta.backend.investment.InvestmentService;
import com.edu.uta.backend.service.SimuladorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Solo desarrollo: crea la cuenta {@code cartera} con productos ya aprobados y pagos registrados, para
 * probar el avance de pagos sin esperar meses:
 * <ul>
 *   <li>un crédito grande con ~70 % de las cuotas pagadas;</li>
 *   <li>un crédito pequeño pagado por completo (cerrado);</li>
 *   <li>una inversión con pagos mensuales y ~70 % de los pagos recibidos.</li>
 * </ul>
 * Las cifras salen de los simuladores reales (como una solicitud normal) y las fechas se corren al pasado.
 * La identidad es ficticia: la cuenta no puede firmar solicitudes nuevas con biometría real.
 */
@Component
@Profile("dev")
@Order(100)
public class DemoPortfolioSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoPortfolioSeeder.class);
    private static final String USERNAME = "cartera";
    private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final TransactionTemplate transactions;
    private final ScenarioCalculator calculator;
    private final SimuladorService credits;
    private final InvestmentService investments;
    private final String password;

    public DemoPortfolioSeeder(JdbcTemplate jdbc, PasswordEncoder encoder, TransactionTemplate transactions,
                               ScenarioCalculator calculator, SimuladorService credits, InvestmentService investments,
                               @Value("${APP_EXAMPLE_PASSWORD:}") String password) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.transactions = transactions;
        this.calculator = calculator;
        this.credits = credits;
        this.investments = investments;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        if (password.isBlank()) return;
        Integer exists = jdbc.queryForObject("SELECT count(*) FROM app_users WHERE username = ?", Integer.class, USERNAME);
        if (exists != null && exists > 0) return;
        try {
            transactions.executeWithoutResult(status -> seed());
            log.info("Cartera de ejemplo creada: usuario '{}'", USERNAME);
        } catch (RuntimeException exception) {
            log.warn("No se pudo crear la cartera de ejemplo: {}", exception.getMessage());
        }
    }

    private void seed() {
        Long customer = jdbc.queryForObject("""
                INSERT INTO app_users (username, email, full_name, password_hash) VALUES (?, ?, ?, ?) RETURNING id
                """, Long.class, USERNAME, "cartera@brunexa.com", "Cliente con cartera", encoder.encode(password));
        jdbc.update("INSERT INTO app_user_roles (user_id, role_code) VALUES (?, 'client')", customer);
        jdbc.update("""
                INSERT INTO customer_profiles (user_id, id_type, id_number, first_names, last_names, birth_date, phone,
                    email_verified) VALUES (?, 'CEDULA', '9999999998', 'Cliente', 'Con cartera', '1988-04-12', '0999999998', true)
                """, customer);
        jdbc.update("""
                INSERT INTO customer_biometrics (user_id, collection_id, face_id, algorithm, consent_at, consent_version)
                VALUES (?, 'demo', 'demo-cartera', 'demo', now(), 'demo')
                """, customer);

        long advisor = staff("credito", customer);
        long analyst = staff("analista", advisor);
        long investmentAdvisor = staff("inversiones", advisor);

        ProductoSimuladorDto big = credits.obtenerProductosDisponibles().stream()
                .filter(product -> !"ANIOS".equals(product.unidadPlazo()))
                .max(Comparator.comparing(ProductoSimuladorDto::montoMax))
                .orElseThrow(() -> new IllegalStateException("no hay tipos de crédito disponibles"));
        ScenarioCalculator.Quote large = calculator.quote(new ScenarioCalculator.Scenario("CREDIT", big.id(),
                clamp(new BigDecimal("25000"), big.montoMin(), big.montoMax()), clamp(36, big.plazoMin(), big.plazoMax()),
                big.sistemasPermitidos().getFirst().name(), null, null));
        insert(customer, large, Math.round(large.schedule().size() * 0.7f), advisor, analyst, "VEHICULO");

        ScenarioCalculator.Quote small = calculator.quote(new ScenarioCalculator.Scenario("CREDIT", big.id(),
                clamp(new BigDecimal("3000"), big.montoMin(), big.montoMax()), clamp(12, big.plazoMin(), big.plazoMax()),
                big.sistemasPermitidos().getFirst().name(), null, null));
        insert(customer, small, small.schedule().size(), advisor, analyst, "CONSUMO_BIENES");

        investmentQuote().ifPresent(quote ->
                insert(customer, quote, Math.max(1, Math.round(quote.schedule().size() * 0.7f)), investmentAdvisor,
                        investmentAdvisor, null));
    }

    /** Plan con pagos mensuales y un plazo que dé varios pagos, para que se vea el avance. */
    private Optional<ScenarioCalculator.Quote> investmentQuote() {
        for (InvestmentService.Product product : investments.publicProducts()) {
            if (!product.payoutFrequencies().contains("MONTHLY")) continue;
            List<Integer> candidates = product.terms().isEmpty()
                    ? List.of(product.maximumTermValue())
                    : product.terms().stream().sorted(Comparator.reverseOrder()).toList();
            BigDecimal amount = clamp(new BigDecimal("20000"), product.minimumAmount(), product.maximumAmount());
            for (Integer term : candidates) {
                try {
                    ScenarioCalculator.Quote quote = calculator.quote(new ScenarioCalculator.Scenario("INVESTMENT",
                            product.id(), amount, term, null, "MONTHLY", null, null, product.termUnit()));
                    if (quote.schedule().size() >= 4) return Optional.of(quote);
                } catch (RuntimeException ignored) {
                    // Plazo no válido para ese monto o frecuencia: se prueba el siguiente.
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Inserta la solicitud aprobada con el cronograma corrido al pasado, de modo que las primeras
     * {@code paid} cuotas ya vencieron y quedan registradas como pagadas en su fecha.
     */
    private void insert(long customer, ScenarioCalculator.Quote quote, int paid, long reviewer, long decider,
                        String purposeCategory) {
        boolean credit = "CREDIT".equals(quote.productType());
        List<ScenarioCalculator.Installment> schedule = quote.schedule();
        LocalDate lastPaidDue = schedule.get(Math.max(0, paid - 1)).dueDate();
        long shift = ChronoUnit.DAYS.between(quote.baseDate(), lastPaidDue) + (paid == schedule.size() ? 20 : 3);
        LocalDate approvedOn = quote.baseDate().minusDays(shift);
        OffsetDateTime approvedAt = approvedOn.atTime(10, 30).atZone(ZONE).toOffsetDateTime();

        Long id = jdbc.queryForObject("""
                INSERT INTO applications (user_id, product_type, product_id, product_name, amount, term, term_unit,
                    amortization_system, payout_frequency, asset_cost, annual_rate, periodic_payment, total_interest,
                    total_insurance, total_charges, total_withholding, total_amount, monthly_income, purpose,
                    schedule_base_date, optional_charges, purpose_category, employment_type, monthly_expenses,
                    funds_source, funds_lawful_declared, status, biometric_result, reviewer_id, decided_by,
                    decision_comment, submitted_at, decided_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'APPROVED',
                    ?, ?, 'Solicitud aprobada.', ?, ?, ?, now()) RETURNING id
                """, Long.class, customer, quote.productType(), quote.productId(), quote.productName(), quote.amount(),
                quote.term(), quote.termUnit(), quote.amortizationSystem(), quote.payoutFrequency(), quote.assetCost(),
                quote.annualRate(), quote.periodicPayment(), quote.totalInterest(), quote.totalInsurance(),
                quote.totalCharges(), quote.totalWithholding(), quote.totalAmount(),
                credit ? new BigDecimal("3500") : null, null, approvedOn, quote.optionalChargesCsv(),
                credit ? purposeCategory : null, credit ? "DEPENDIENTE" : null, credit ? new BigDecimal("1200") : null,
                credit ? null : "SUELDO_AHORROS", !credit, reviewer, decider,
                approvedAt.minusDays(2), approvedAt, approvedAt.minusDays(2).minusHours(1));
        String code = (credit ? "CR-" : "IN-") + approvedOn.getYear() + "-" + String.format(Locale.ROOT, "%05d", id);
        jdbc.update("UPDATE applications SET code = ? WHERE id = ?", code, id);

        for (ScenarioCalculator.Installment row : schedule) {
            jdbc.update("""
                    INSERT INTO application_schedule (application_id, number, due_date, opening_balance, principal,
                        interest, insurance, charges, withholding, payment, closing_balance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, id, row.number(), row.dueDate().minusDays(shift), row.openingBalance(), row.principal(),
                    row.interest(), row.insurance(), row.charges(), row.withholding(), row.payment(), row.closingBalance());
        }
        for (ScenarioCalculator.Installment row : schedule.subList(0, paid)) {
            LocalDate paidAt = row.dueDate().minusDays(shift);
            jdbc.update("""
                    INSERT INTO application_payments (application_id, installment_number, amount, paid_at, recorded_by,
                        recorded_at) VALUES (?, ?, ?, ?, ?, ?)
                    """, id, row.number(), row.payment(), paidAt, reviewer, paidAt.atTime(16, 0).atZone(ZONE).toOffsetDateTime());
        }

        event(id, null, "DRAFT", "Solicitud creada a partir de la simulación.", customer, approvedAt.minusDays(2).minusHours(1));
        event(id, "DRAFT", "SUBMITTED", "Identidad confirmada con prueba de vida. Solicitud enviada.", customer,
                approvedAt.minusDays(2));
        event(id, "SUBMITTED", "IN_REVIEW", "Un asesor tomó la solicitud para revisarla.", reviewer, approvedAt.minusDays(1));
        event(id, "IN_REVIEW", "APPROVED", "Solicitud aprobada.", decider, approvedAt);
        if (paid == schedule.size()) {
            LocalDate lastPaid = schedule.getLast().dueDate().minusDays(shift);
            event(id, "APPROVED", "APPROVED", credit ? "Crédito pagado por completo. ¡Felicitaciones!"
                    : "Inversión liquidada: se pagaron todos los intereses y se devolvió el capital.",
                    reviewer, lastPaid.atTime(16, 5).atZone(ZONE).toOffsetDateTime());
        }
    }

    private void event(long id, String from, String to, String comment, long actor, OffsetDateTime at) {
        jdbc.update("""
                INSERT INTO application_events (application_id, from_status, to_status, comment, actor_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, from, to, comment, actor, at);
    }

    private long staff(String username, long fallback) {
        return jdbc.query("SELECT id FROM app_users WHERE username = ?", rs -> rs.next() ? rs.getLong(1) : fallback,
                username);
    }

    private static BigDecimal clamp(BigDecimal value, BigDecimal minimum, BigDecimal maximum) {
        return value.max(minimum).min(maximum);
    }

    private static int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
}
