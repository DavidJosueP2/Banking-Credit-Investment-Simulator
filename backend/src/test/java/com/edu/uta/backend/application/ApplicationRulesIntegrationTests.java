package com.edu.uta.backend.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

import com.edu.uta.backend.dto.ProductoSimuladorDto;
import com.edu.uta.backend.dashboard.DashboardService;
import com.edu.uta.backend.investment.InvestmentService;
import com.edu.uta.backend.mail.BrandedMailer;
import com.edu.uta.backend.service.SimuladorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de negocio de las solicitudes contra la base real. Cada prueba corre dentro de una transacción
 * que se deshace al terminar: no deja usuarios ni solicitudes. Los correos se simulan.
 */
@SpringBootTest
@Transactional
class ApplicationRulesIntegrationTests {

    private static final Set<String> STAFF = Set.of(ApplicationService.CREDIT_REVIEW, ApplicationService.INVESTMENT_REVIEW,
            ApplicationService.PAYMENTS_REGISTER);

    @Autowired private ApplicationService applications;
    @Autowired private SimuladorService credits;
    @Autowired private InvestmentService investments;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DashboardService dashboard;
    @MockitoBean private BrandedMailer mailer;

    private String customer;
    private String staff;

    @BeforeEach
    void accounts() {
        customer = user("prueba_cliente", "client");
        staff = user("prueba_asesor", "credit_advisor");
        long id = jdbc.queryForObject("SELECT id FROM app_users WHERE username = ?", Long.class, customer);
        jdbc.update("""
                INSERT INTO customer_profiles (user_id, id_type, id_number, first_names, last_names, birth_date, phone,
                    email_verified) VALUES (?, 'CEDULA', '9999999997', 'Prueba', 'Cliente', '1990-01-01', '0999999997', true)
                """, id);
        jdbc.update("""
                INSERT INTO customer_biometrics (user_id, collection_id, face_id, algorithm, consent_at, consent_version)
                VALUES (?, 'test', 'test-face', 'test', now(), 'test')
                """, id);
    }

    @Test
    void oneOpenApplicationPerCreditType() {
        applications.create(customer, credit(null));
        IllegalStateException error = assertThrows(IllegalStateException.class, () -> applications.create(customer, credit(null)));
        assertTrue(error.getMessage().contains("en trámite de este tipo de crédito"));
    }

    @Test
    void severalInvestmentsOfTheSamePlanUpToFive() {
        ApplicationService.Detail first = null;
        for (int index = 0; index < 5; index++) {
            ApplicationService.Detail created = applications.create(customer, investment(true));
            if (first == null) first = created;
        }
        IllegalStateException error = assertThrows(IllegalStateException.class, () -> applications.create(customer, investment(true)));
        assertTrue(error.getMessage().contains("máximo"));
        applications.cancel(customer, first.id(), null);
        assertDoesNotThrow(() -> applications.create(customer, investment(true)),
                "cancelar una inversión libera un cupo");
    }

    @Test
    void investmentRequiresLawfulFundsDeclaration() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> applications.create(customer, investment(false)));
        assertTrue(error.getMessage().contains("origen lícito"));
    }

    @Test
    void creditDeclarationIsValidated() {
        ApplicationService.NewApplication base = credit(null);
        assertThrows(IllegalArgumentException.class, () -> applications.create(customer, withExpenses(base, "1500")),
                "gastos iguales al ingreso");
        assertThrows(IllegalArgumentException.class, () -> applications.create(customer, withCategory(base, "OTRO", "")),
                "'Otro' sin detalle");
        assertThrows(IllegalArgumentException.class, () -> applications.create(customer, withCategory(base, "LOTERIA", "")),
                "categoría desconocida");
        ApplicationService.Detail created = applications.create(customer, withCategory(base, "OTRO", "Compra de equipo médico"));
        assertEquals("OTRO", created.declaration().purposeCategory());
        assertEquals("DEPENDIENTE", created.declaration().employmentType());
    }

    @Test
    void customerCanAttachDocumentsBeforeAndAfterSendingWhileDecisionIsPending() {
        ApplicationService.Detail draft = applications.create(customer, credit(null));
        long id = draft.id();
        byte[] pdf = "%PDF-1.4 archivo de prueba".getBytes(StandardCharsets.UTF_8);

        ApplicationService.DocumentInfo first = applications.upload(customer, id, "ingresos.pdf", "application/pdf", pdf);
        assertEquals("DRAFT", applications.customerApplication(customer, id).status(),
                "adjuntar no debe enviar la solicitud");
        assertEquals(1, applications.customerApplication(customer, id).documents().size());
        applications.deleteDocument(customer, id, first.id());

        jdbc.update("UPDATE applications SET status = 'SUBMITTED' WHERE id = ?", id);
        ApplicationService.DocumentInfo sent = applications.upload(customer, id, "proforma.pdf", "application/pdf", pdf);
        assertEquals(1, applications.customerApplication(customer, id).documents().size());
        assertTrue(applications.customerApplication(customer, id).events().stream()
                .anyMatch(event -> event.comment().contains("proforma.pdf")));
        assertThrows(IllegalStateException.class, () -> applications.deleteDocument(customer, id, sent.id()),
                "lo enviado no se retira mientras espera revisión");

        jdbc.update("UPDATE applications SET status = 'IN_REVIEW' WHERE id = ?", id);
        assertDoesNotThrow(() -> applications.upload(customer, id, "anexo.pdf", "application/pdf", pdf));
        jdbc.update("UPDATE applications SET status = 'OBSERVED' WHERE id = ?", id);
        assertDoesNotThrow(() -> applications.upload(customer, id, "respuesta.pdf", "application/pdf", pdf));
        jdbc.update("UPDATE applications SET status = 'APPROVED' WHERE id = ?", id);
        assertThrows(IllegalStateException.class,
                () -> applications.upload(customer, id, "tarde.pdf", "application/pdf", pdf));
    }

    @Test
    void settledProductIsClosed() {
        ApplicationService.Detail created = applications.create(customer, credit(null));
        jdbc.update("UPDATE applications SET status = 'APPROVED', biometric_result = 'APPROVED' WHERE id = ?", created.id());
        int installments = created.schedule().size();

        ApplicationService.ReviewDetail last = null;
        for (int number = 1; number <= installments; number++) {
            last = applications.registerPayment(staff, STAFF, created.id(),
                    new ApplicationService.RegisterPayment(null, null, null));
        }
        assertEquals(installments, last.application().paidThroughInstallment());
        assertFalse(last.actions().canRegisterPayment(), "cerrado: ya no se registran pagos");
        assertThrows(IllegalStateException.class, () -> applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(null, null, null)));

        long lastPayment = last.application().payments().getLast().id();
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> applications.deletePayment(staff, STAFF, created.id(), lastPayment));
        assertTrue(error.getMessage().contains("cerrado"));
        assertTrue(last.application().events().stream().anyMatch(event -> event.comment().contains("pagado por completo")));
    }

    @Test
    void settledInvestmentCannotReceiveOrRemovePayments() {
        ApplicationService.Detail created = applications.create(customer, investment(true));
        jdbc.update("UPDATE applications SET status = 'APPROVED', biometric_result = 'APPROVED' WHERE id = ?", created.id());

        ApplicationService.ReviewDetail last = null;
        for (int number = 1; number <= created.schedule().size(); number++) {
            last = applications.registerPayment(staff, STAFF, created.id(),
                    new ApplicationService.RegisterPayment(null, null, null));
        }
        assertFalse(last.actions().canRegisterPayment());
        assertTrue(last.application().events().stream().anyMatch(event -> event.comment().contains("liquidada")));
        long lastPayment = last.application().payments().getLast().id();
        assertThrows(IllegalStateException.class, () -> applications.deletePayment(staff, STAFF, created.id(), lastPayment));
        assertThrows(IllegalStateException.class, () -> applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(null, null, null)));
    }

    @Test
    void lastPaymentCanBeRemovedWhileOpen() {
        ApplicationService.Detail created = applications.create(customer, credit(null));
        jdbc.update("UPDATE applications SET status = 'APPROVED' WHERE id = ?", created.id());
        ApplicationService.ReviewDetail paid = applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(null, null, null));
        assertEquals(0, paid.application().payments().getFirst().amount()
                .compareTo(created.schedule().getFirst().payment()));
        ApplicationService.ReviewDetail corrected = assertDoesNotThrow(() -> applications.deletePayment(staff, STAFF,
                created.id(), paid.application().payments().getFirst().id()));
        assertTrue(corrected.application().events().stream()
                .anyMatch(event -> event.comment().contains("anuló el registro del pago")));
    }

    @Test
    void aCentCannotSettleAnInstallment() {
        ApplicationService.Detail created = applications.create(customer, credit(null));
        jdbc.update("UPDATE applications SET status = 'APPROVED' WHERE id = ?", created.id());

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> applications.registerPayment(staff, STAFF, created.id(),
                        new ApplicationService.RegisterPayment(new BigDecimal("0.01"), null, null)));
        assertTrue(error.getMessage().contains("cuota completa"));
        assertEquals(0, applications.customerApplication(customer, created.id()).paidThroughInstallment());
        assertTrue(applications.customerApplication(customer, created.id()).payments().isEmpty());
        assertThrows(IllegalArgumentException.class, () -> applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(created.schedule().getFirst().payment().add(BigDecimal.ONE),
                        null, null)));
    }

    @Test
    void existingInsufficientPaymentsDoNotCountAsPaidAndMustBeCorrectedInReverseOrder() {
        ApplicationService.Detail created = applications.create(customer, credit(null));
        jdbc.update("UPDATE applications SET status = 'APPROVED' WHERE id = ?", created.id());
        long staffId = jdbc.queryForObject("SELECT id FROM app_users WHERE username = ?", Long.class, staff);
        long firstId = jdbc.queryForObject("""
                INSERT INTO application_payments (application_id, installment_number, amount, paid_at, recorded_by)
                VALUES (?, 1, 0.01, CURRENT_DATE, ?) RETURNING id
                """, Long.class, created.id(), staffId);
        long secondId = jdbc.queryForObject("""
                INSERT INTO application_payments (application_id, installment_number, amount, paid_at, recorded_by)
                VALUES (?, 2, ?, CURRENT_DATE, ?) RETURNING id
                """, Long.class, created.id(), created.schedule().get(1).payment(), staffId);

        assertEquals(0, applications.customerApplication(customer, created.id()).paidThroughInstallment());
        ApplicationService.Summary summary = applications.customerApplications(customer).stream()
                .filter(item -> item.id() == created.id()).findFirst().orElseThrow();
        assertEquals(0, summary.elapsedInstallments());
        assertEquals(created.schedule().getFirst().dueDate(), summary.nextDueDate());
        assertThrows(IllegalStateException.class, () -> applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(null, null, null)));

        applications.deletePayment(staff, STAFF, created.id(), secondId);
        applications.deletePayment(staff, STAFF, created.id(), firstId);
        ApplicationService.ReviewDetail corrected = applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(null, null, null));
        assertEquals(1, corrected.application().paidThroughInstallment());
        assertEquals(0, corrected.application().payments().getFirst().amount()
                .compareTo(created.schedule().getFirst().payment()));
    }

    @Test
    void oldIncompleteLastPaymentDoesNotCloseTheCredit() {
        BigDecimal activeBefore = dashboard.summary(STAFF).kpis().stream()
                .filter(kpi -> kpi.key().equals("portfolio")).findFirst().orElseThrow().value();
        ApplicationService.Detail created = applications.create(customer, credit(null));
        jdbc.update("UPDATE applications SET status = 'APPROVED' WHERE id = ?", created.id());
        long staffId = jdbc.queryForObject("SELECT id FROM app_users WHERE username = ?", Long.class, staff);
        for (var row : created.schedule()) {
            jdbc.update("""
                    INSERT INTO application_payments (application_id, installment_number, amount, paid_at, recorded_by)
                    VALUES (?, ?, ?, CURRENT_DATE, ?)
                    """, created.id(), row.number(), row.number() == created.schedule().size()
                    ? new BigDecimal("0.21") : row.payment(), staffId);
        }

        assertEquals(created.schedule().size() - 1,
                applications.customerApplication(customer, created.id()).paidThroughInstallment());
        BigDecimal activeAfter = dashboard.summary(STAFF).kpis().stream()
                .filter(kpi -> kpi.key().equals("portfolio")).findFirst().orElseThrow().value();
        assertEquals(0, activeAfter.compareTo(activeBefore.add(BigDecimal.ONE)));
        ApplicationService.ReviewDetail review = applications.reviewDetail(staff, STAFF, created.id());
        assertTrue(review.actions().canRegisterPayment(), "la última cuota no es válida y se puede corregir");
        long incorrectId = review.application().payments().getLast().id();
        applications.deletePayment(staff, STAFF, created.id(), incorrectId);
        ApplicationService.ReviewDetail settled = applications.registerPayment(staff, STAFF, created.id(),
                new ApplicationService.RegisterPayment(null, null, null));
        assertFalse(settled.actions().canRegisterPayment());
    }

    @Test
    void discontinuedDraftCannotBeSigned() {
        ApplicationService.Detail draft = applications.create(customer, investment(true));
        assertTrue(draft.productAvailable());
        jdbc.update("UPDATE investment_products SET active = false WHERE id = ?", draft.productId());

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> applications.startBiometric(customer, draft.id()));
        assertTrue(error.getMessage().contains("dejó de ofrecerse"));
        assertFalse(applications.customerApplication(customer, draft.id()).productAvailable());
    }

    // ─── Datos de prueba ────────────────────────────────────────────────────

    private String user(String username, String role) {
        jdbc.update("INSERT INTO app_users (username, email, full_name, password_hash) VALUES (?, ?, ?, 'x')",
                username, username + "@brunexa.com", "Prueba " + username);
        jdbc.update("INSERT INTO app_user_roles (user_id, role_code) SELECT id, ? FROM app_users WHERE username = ?",
                role, username);
        return username;
    }

    private ApplicationService.NewApplication credit(String purposeCategory) {
        ProductoSimuladorDto product = credits.obtenerProductosDisponibles().stream()
                .filter(item -> !"ANIOS".equals(item.unidadPlazo())).findFirst().orElseThrow();
        return new ApplicationService.NewApplication("CREDIT", product.id(), product.montoMin(), product.plazoMin(),
                product.sistemasPermitidos().getFirst().name(), null, null, new BigDecimal("1500"), "",
                List.of(), null, purposeCategory == null ? "VEHICULO" : purposeCategory, "DEPENDIENTE",
                new BigDecimal("500"), null, null);
    }

    private ApplicationService.NewApplication investment(boolean lawful) {
        InvestmentService.Product product = investments.publicProducts().getFirst();
        int term = product.terms().isEmpty() ? product.minimumTermValue() : product.terms().getFirst();
        return new ApplicationService.NewApplication("INVESTMENT", product.id(), product.minimumAmount(), term, null,
                product.payoutFrequencies().getFirst(), null, null, "", List.of(), product.termUnit(), null, null, null,
                "SUELDO_AHORROS", lawful);
    }

    private static ApplicationService.NewApplication withExpenses(ApplicationService.NewApplication base, String expenses) {
        return new ApplicationService.NewApplication(base.productType(), base.productId(), base.amount(), base.term(),
                base.amortizationSystem(), base.payoutFrequency(), base.assetCost(), base.monthlyIncome(), base.purpose(),
                base.optionalCharges(), base.termUnit(), base.purposeCategory(), base.employmentType(),
                new BigDecimal(expenses), base.fundsSource(), base.fundsLawfulDeclared());
    }

    private static ApplicationService.NewApplication withCategory(ApplicationService.NewApplication base, String category,
                                                                  String detail) {
        return new ApplicationService.NewApplication(base.productType(), base.productId(), base.amount(), base.term(),
                base.amortizationSystem(), base.payoutFrequency(), base.assetCost(), base.monthlyIncome(), detail,
                base.optionalCharges(), base.termUnit(), category, base.employmentType(), base.monthlyExpenses(),
                base.fundsSource(), base.fundsLawfulDeclared());
    }
}
