package com.edu.uta.backend.application;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;

import com.edu.uta.backend.identity.IdentityService;
import com.edu.uta.backend.registration.CustomerProfile;
import com.edu.uta.backend.registration.CustomerProfileRepository;
import com.edu.uta.backend.settings.InstitutionSettingsService;
import com.edu.uta.backend.verification.AwsProperties;
import com.edu.uta.backend.verification.CustomerBiometric;
import com.edu.uta.backend.verification.CustomerBiometricRepository;
import com.edu.uta.backend.verification.LivenessService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sts.StsClient;

/**
 * Flujo de solicitudes en línea: borrador → confirmación biométrica → envío → revisión del asesor.
 * Consume el cálculo de créditos e inversiones y la verificación de identidad; no rehace ninguno.
 */
@Service
public class ApplicationService {

    public static final Set<String> OPEN_STATUSES = Set.of("DRAFT", "SUBMITTED", "IN_REVIEW", "OBSERVED", "PENDING_APPROVAL");
    /** Asesor de crédito: revisa, pide información y recomienda. */
    public static final String CREDIT_REVIEW = "credit.requests.review";
    /** Analista de crédito: aprueba o rechaza lo recomendado. */
    public static final String CREDIT_APPROVE = "credit.requests.approve";
    public static final String INVESTMENT_REVIEW = "investment.requests.review";
    /** Administración: consulta sin decidir. */
    public static final String AUDIT = "requests.audit";
    /** Bookkeeping de pagos y desembolsos; no es una decisión de crédito. */
    public static final String PAYMENTS_REGISTER = "payments.register";

    private static final int MAX_BIOMETRIC_ATTEMPTS = 5;
    private static final int MAX_DOCUMENTS = 6;
    private static final int MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
    private static final Set<String> DOCUMENT_TYPES = Set.of("application/pdf", "image/jpeg", "image/png");
    private static final int CREDENTIALS_SECONDS = 900;
    private static final String LIVENESS_ONLY_POLICY = """
            {"Version":"2012-10-17","Statement":[{"Effect":"Allow",\
            "Action":"rekognition:StartFaceLivenessSession","Resource":"*"}]}""";

    private final JdbcTemplate jdbc;
    private final ScenarioCalculator calculator;
    private final IdentityService identity;
    private final CustomerProfileRepository profiles;
    private final CustomerBiometricRepository biometrics;
    private final LivenessService liveness;
    private final StsClient sts;
    private final AwsProperties aws;
    private final InstitutionSettingsService settings;
    private final ApplicationNotifier notifier;

    public ApplicationService(JdbcTemplate jdbc, ScenarioCalculator calculator, IdentityService identity,
                              CustomerProfileRepository profiles, CustomerBiometricRepository biometrics,
                              LivenessService liveness, StsClient sts, AwsProperties aws,
                              InstitutionSettingsService settings, ApplicationNotifier notifier) {
        this.jdbc = jdbc;
        this.calculator = calculator;
        this.identity = identity;
        this.profiles = profiles;
        this.biometrics = biometrics;
        this.liveness = liveness;
        this.sts = sts;
        this.aws = aws;
        this.settings = settings;
        this.notifier = notifier;
    }

    // ─── Contratos ────────────────────────────────────────────────────────────

    public record NewApplication(String productType, Long productId, BigDecimal amount, Integer term,
                                 String amortizationSystem, String payoutFrequency, BigDecimal assetCost,
                                 BigDecimal monthlyIncome, String purpose, List<Long> optionalCharges,
                                 String termUnit) {}

    public record Readiness(String fullName, boolean hasProfile, boolean emailVerified, boolean identityVerified,
                            Instant identityVerifiedAt, boolean ready) {}

    public record Summary(long id, String code, String productType, long productId, String productName,
                          BigDecimal amount, int term, String termUnit, String amortizationSystem,
                          String payoutFrequency, BigDecimal annualRate, BigDecimal periodicPayment,
                          BigDecimal totalAmount, String status, String biometricResult, String customerName,
                          String reviewerName, OffsetDateTime submittedAt, OffsetDateTime decidedAt,
                          OffsetDateTime createdAt, OffsetDateTime updatedAt, LocalDate nextDueDate,
                          BigDecimal nextPayment, int elapsedInstallments, int totalInstallments,
                          BigDecimal projectedBalance) {}

    public record Detail(long id, String code, String productType, long productId, String productName,
                         BigDecimal amount, int term, String termUnit, String amortizationSystem,
                         String payoutFrequency, BigDecimal assetCost, BigDecimal annualRate,
                         BigDecimal periodicPayment, BigDecimal totalInterest, BigDecimal totalInsurance,
                         BigDecimal totalCharges, BigDecimal totalWithholding, BigDecimal totalAmount,
                         BigDecimal monthlyIncome, String purpose, String status, String biometricResult,
                         int biometricAttemptsLeft, String reviewerName, String decisionComment,
                         LocalDate scheduleBaseDate, OffsetDateTime submittedAt, OffsetDateTime decidedAt,
                         OffsetDateTime createdAt, OffsetDateTime updatedAt, List<Long> optionalCharges,
                         String recommendation, String recommendationComment, String recommendedByName,
                         OffsetDateTime recommendedAt, String decidedByName,
                         List<ScenarioCalculator.Installment> schedule, List<Event> events,
                         List<DocumentInfo> documents, int paidThroughInstallment, List<PaymentRecord> payments) {}

    public record PaymentRecord(long id, int installmentNumber, BigDecimal amount, LocalDate paidAt, String note,
                                String recordedByName, OffsetDateTime recordedAt) {}

    public record RegisterPayment(BigDecimal amount, LocalDate paidAt, String note) {}

    public record Event(String fromStatus, String toStatus, String comment, String actorName,
                        boolean byCustomer, OffsetDateTime createdAt) {}

    public record DocumentInfo(long id, String fileName, String contentType, int sizeBytes, boolean byCustomer,
                               OffsetDateTime uploadedAt) {}

    public record Document(String fileName, String contentType, byte[] content) {}

    public record LivenessTicket(String sessionId, String region, String accessKeyId, String secretAccessKey,
                                 String sessionToken, String expiration) {}

    public record BiometricResult(LivenessService.Outcome outcome, Detail application) {}

    public record CustomerFile(long userId, String fullName, String username, String email, String idType,
                               String idNumber, LocalDate birthDate, String phone, String address,
                               boolean emailVerified, Instant identityVerifiedAt, boolean documentFront,
                               boolean documentBack, List<Summary> otherApplications) {}

    /**
     * Lo que la persona que revisa puede hacer ahora mismo. Lo calcula el servidor para que la interfaz
     * no tenga que replicar la separación de funciones.
     */
    public record Actions(boolean canTake, boolean canObserve, boolean canRecommend, boolean canDecide,
                          boolean canFinalize, boolean canReturn, boolean canRegisterPayment,
                          BigDecimal advisorApprovalLimit, boolean withinAdvisorLimit, String notice) {}

    public record ReviewDetail(Detail application, CustomerFile customer, Actions actions) {}

    private record Owned(long id, long userId, String productType, String status, String biometricSessionId,
                         int biometricAttempts, String biometricResult, LocalDate scheduleBaseDate,
                         BigDecimal amount, Long reviewerId, Long recommendedBy, String recommendation,
                         String code, String productName) {}

    // ─── Cliente ─────────────────────────────────────────────────────────────

    public Readiness readiness(String username) {
        IdentityService.Account account = identity.accountByUsername(username);
        CustomerProfile profile = profiles.findByUserId(account.id()).orElse(null);
        CustomerBiometric biometric = biometrics.findByUserId(account.id()).orElse(null);
        boolean emailVerified = profile != null && identity.emailVerified(account.id());
        return new Readiness(account.fullName(), profile != null, emailVerified, biometric != null,
                biometric == null ? null : biometric.getEnrolledAt(),
                profile != null && emailVerified && biometric != null);
    }

    public List<Summary> customerApplications(String username) {
        return summaries("WHERE a.user_id = ?", identity.accountByUsername(username).id());
    }

    public Detail customerApplication(String username, long id) {
        Owned owned = owned(username, id);
        return customerDetail(owned.id());
    }

    @Transactional
    public Detail create(String username, NewApplication input) {
        IdentityService.Account account = identity.accountByUsername(username);
        Readiness readiness = readiness(username);
        if (!readiness.hasProfile()) {
            throw new IllegalArgumentException(
                    "Para solicitar necesitas verificar tu identidad (documento y rostro) en Mi perfil.");
        }
        if (!readiness.emailVerified()) {
            throw new IllegalArgumentException("Verifica tu correo antes de enviar una solicitud.");
        }
        if (!readiness.identityVerified()) {
            throw new IllegalArgumentException(
                    "Confirma tu identidad (documento y rostro) en Mi perfil antes de enviar una solicitud.");
        }

        String type = ScenarioCalculator.normalizeType(input.productType());
        String purpose = input.purpose() == null ? "" : input.purpose().trim();
        if (purpose.length() < 5 || purpose.length() > 300) {
            throw new IllegalArgumentException("CREDIT".equals(type)
                    ? "Cuéntanos en qué usarás el crédito (entre 5 y 300 caracteres)."
                    : "Indica el origen de los fondos que invertirás (entre 5 y 300 caracteres).");
        }
        BigDecimal income = "CREDIT".equals(type) ? input.monthlyIncome() : null;
        if ("CREDIT".equals(type) && (income == null || income.signum() <= 0)) {
            throw new IllegalArgumentException("Ingresa tu ingreso mensual para evaluar el crédito.");
        }

        ScenarioCalculator.Quote quote = calculator.quote(new ScenarioCalculator.Scenario(type, input.productId(),
                input.amount(), input.term(), input.amortizationSystem(), input.payoutFrequency(),
                input.assetCost(), input.optionalCharges(), input.termUnit()));

        String existing = jdbc.query("""
                SELECT code FROM applications WHERE user_id = ? AND product_type = ? AND product_id = ?
                    AND status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED', 'PENDING_APPROVAL')
                """, rs -> rs.next() ? rs.getString("code") : null, account.id(), quote.productType(),
                quote.productId());
        if (existing != null) {
            throw new IllegalStateException("Ya tienes una solicitud abierta para este crédito o inversión (" + existing
                    + "). Continúala o cancélala antes de crear otra.");
        }

        Long id = jdbc.queryForObject("""
                INSERT INTO applications (user_id, product_type, product_id, product_name, amount, term, term_unit,
                    amortization_system, payout_frequency, asset_cost, annual_rate, periodic_payment, total_interest,
                    total_insurance, total_charges, total_withholding, total_amount, monthly_income, purpose,
                    schedule_base_date, optional_charges)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, account.id(), quote.productType(), quote.productId(), quote.productName(),
                quote.amount(), quote.term(), quote.termUnit(), quote.amortizationSystem(), quote.payoutFrequency(),
                quote.assetCost(), quote.annualRate(), quote.periodicPayment(), quote.totalInterest(),
                quote.totalInsurance(), quote.totalCharges(), quote.totalWithholding(), quote.totalAmount(), income,
                purpose, quote.baseDate(), quote.optionalChargesCsv());
        String code = ("CREDIT".equals(quote.productType()) ? "CR-" : "IN-") + Year.now().getValue() + "-"
                + String.format(Locale.ROOT, "%05d", id);
        jdbc.update("UPDATE applications SET code = ? WHERE id = ?", code, id);

        jdbc.batchUpdate("""
                INSERT INTO application_schedule (application_id, number, due_date, opening_balance, principal,
                    interest, insurance, charges, withholding, payment, closing_balance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, quote.schedule(), 200, (statement, row) -> {
            statement.setLong(1, id);
            statement.setInt(2, row.number());
            statement.setObject(3, row.dueDate());
            statement.setBigDecimal(4, row.openingBalance());
            statement.setBigDecimal(5, row.principal());
            statement.setBigDecimal(6, row.interest());
            statement.setBigDecimal(7, row.insurance());
            statement.setBigDecimal(8, row.charges());
            statement.setBigDecimal(9, row.withholding());
            statement.setBigDecimal(10, row.payment());
            statement.setBigDecimal(11, row.closingBalance());
        });
        event(id, null, "DRAFT", "Solicitud creada a partir de la simulación.", account.id());
        return customerDetail(id);
    }

    @Transactional
    public LivenessTicket startBiometric(String username, long id) {
        Owned owned = owned(username, id);
        requireStatus(owned, Set.of("DRAFT"), "La solicitud ya fue enviada.");
        if (owned.biometricAttempts() >= MAX_BIOMETRIC_ATTEMPTS) {
            throw new IllegalStateException("Superaste los intentos de verificación facial para esta solicitud. "
                    + "Cancélala y crea una nueva, o comunícate con un asesor.");
        }
        String sessionId;
        try {
            sessionId = liveness.startSession(username);
        } catch (NoSuchElementException exception) {
            throw new IllegalArgumentException(
                    "Tu cuenta no tiene un rostro registrado. Completa la verificación de identidad en Mi perfil.");
        }
        jdbc.update("""
                UPDATE applications SET biometric_session_id = ?, biometric_attempts = biometric_attempts + 1,
                    updated_at = now() WHERE id = ?
                """, sessionId, id);
        var credentials = sts.getFederationToken(request -> request
                .name("brunexa-application")
                .policy(LIVENESS_ONLY_POLICY)
                .durationSeconds(CREDENTIALS_SECONDS)).credentials();
        return new LivenessTicket(sessionId, aws.region(), credentials.accessKeyId(), credentials.secretAccessKey(),
                credentials.sessionToken(), credentials.expiration().toString());
    }

    /** La prueba de vida firma el envío: se compara con el rostro registrado y queda atada a esta solicitud. */
    @Transactional
    public BiometricResult completeBiometric(String username, long id, String sessionId) {
        Owned owned = owned(username, id);
        requireStatus(owned, Set.of("DRAFT"), "La solicitud ya fue enviada.");
        if (owned.biometricSessionId() == null || !owned.biometricSessionId().equals(sessionId)) {
            throw new IllegalArgumentException("La verificación facial expiró. Vuelve a iniciarla.");
        }
        String operation = "CREDIT".equals(owned.productType()) ? "CREDIT_APPLICATION" : "INVESTMENT_APPLICATION";
        LivenessService.Outcome outcome = liveness.verify(username, sessionId, operation, id);
        jdbc.update("UPDATE applications SET biometric_session_id = NULL, updated_at = now() WHERE id = ?", id);

        if (!"REJECTED".equals(outcome.result())) {
            jdbc.update("""
                    UPDATE applications SET status = 'SUBMITTED', biometric_result = ?, submitted_at = now(),
                        updated_at = now() WHERE id = ?
                    """, outcome.result(), id);
            event(id, "DRAFT", "SUBMITTED", "APPROVED".equals(outcome.result())
                    ? "Identidad confirmada con prueba de vida. Solicitud enviada."
                    : "Solicitud enviada. El parecido facial no fue concluyente: un asesor revisará tu identidad.",
                    owned.userId());
            IdentityService.Account customer = identity.accountById(owned.userId());
            notifier.notifySubmitted(customer.email(), customer.fullName(), owned.code(), owned.productName());
        }
        return new BiometricResult(outcome, customerDetail(id));
    }

    @Transactional
    public Detail cancel(String username, long id, String comment) {
        Owned owned = owned(username, id);
        requireStatus(owned, Set.of("DRAFT", "SUBMITTED", "OBSERVED"),
                "La solicitud ya está en revisión o tiene una decisión.");
        changeStatus(id, owned.status(), "CANCELLED", blankToNull(comment, "Cancelada por el cliente."),
                owned.userId());
        return customerDetail(id);
    }

    @Transactional
    public Detail respond(String username, long id, String comment) {
        Owned owned = owned(username, id);
        requireStatus(owned, Set.of("OBSERVED"), "La solicitud no tiene observaciones pendientes.");
        String text = requireComment(comment, "Responde a la observación del asesor (mínimo 5 caracteres).", 5);
        jdbc.update("UPDATE applications SET status = 'SUBMITTED', updated_at = now() WHERE id = ?", id);
        event(id, "OBSERVED", "SUBMITTED", text, owned.userId());
        return customerDetail(id);
    }

    @Transactional
    public DocumentInfo upload(String username, long id, String fileName, String contentType, byte[] content) {
        Owned owned = owned(username, id);
        requireStatus(owned, Set.of("DRAFT", "OBSERVED"),
                "Solo puedes adjuntar documentos antes de enviar la solicitud o cuando el asesor lo pida.");
        if (content == null || content.length == 0) throw new IllegalArgumentException("El archivo está vacío.");
        if (content.length > MAX_DOCUMENT_BYTES) {
            throw new IllegalArgumentException("Cada archivo puede pesar hasta 5 MB.");
        }
        String type = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (!DOCUMENT_TYPES.contains(type) || !matchesSignature(type, content)) {
            throw new IllegalArgumentException("Adjunta archivos PDF, JPG o PNG.");
        }
        Integer count = jdbc.queryForObject("SELECT count(*) FROM application_documents WHERE application_id = ?",
                Integer.class, id);
        if (count != null && count >= MAX_DOCUMENTS) {
            throw new IllegalArgumentException("Puedes adjuntar hasta " + MAX_DOCUMENTS + " documentos.");
        }
        String name = fileName == null || fileName.isBlank() ? "documento" : fileName.replaceAll("[\\\\/\\r\\n]", "_");
        if (name.length() > 160) name = name.substring(name.length() - 160);
        Long documentId = jdbc.queryForObject("""
                INSERT INTO application_documents (application_id, file_name, content_type, size_bytes, content,
                    uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, id, name, type, content.length, content, owned.userId());
        jdbc.update("UPDATE applications SET updated_at = now() WHERE id = ?", id);
        return documents(id).stream().filter(item -> item.id() == documentId).findFirst().orElseThrow();
    }

    @Transactional
    public void deleteDocument(String username, long id, long documentId) {
        Owned owned = owned(username, id);
        requireStatus(owned, Set.of("DRAFT", "OBSERVED"), "Ya no puedes quitar documentos de esta solicitud.");
        int removed = jdbc.update(
                "DELETE FROM application_documents WHERE id = ? AND application_id = ? AND uploaded_by = ?",
                documentId, id, owned.userId());
        if (removed == 0) throw new NoSuchElementException("No encontramos el documento.");
    }

    public Document customerDocument(String username, long id, long documentId) {
        owned(username, id);
        return document(id, documentId);
    }

    // ─── Asesor ──────────────────────────────────────────────────────────────

    public List<Summary> queue(Set<String> authorities) {
        List<String> types = reviewableTypes(authorities);
        if (types.isEmpty()) return List.of();
        String placeholders = String.join(", ", types.stream().map(type -> "?").toList());
        return summaries("WHERE a.status <> 'DRAFT' AND a.product_type IN (" + placeholders + ")", types.toArray());
    }

    public ReviewDetail reviewDetail(String username, Set<String> authorities, long id) {
        Owned application = reviewable(authorities, id);
        long me = identity.accountByUsername(username).id();
        return new ReviewDetail(detail(id, false), customerFile(application.userId(), id),
                actions(application, authorities, me));
    }

    public Document reviewDocument(Set<String> authorities, long id, long documentId) {
        reviewable(authorities, id);
        return document(id, documentId);
    }

    /** Documento de identidad que el cliente subió al registrarse (dueño: módulo de verificación). */
    public Document identityDocument(Set<String> authorities, long id, String side) {
        Owned application = reviewable(authorities, id);
        String normalized = side == null ? "" : side.toUpperCase(Locale.ROOT);
        if (!Set.of("FRONT", "BACK").contains(normalized)) throw new IllegalArgumentException("Lado no válido.");
        List<Document> found = jdbc.query("""
                SELECT content_type, content FROM identity_documents WHERE user_id = ? AND document_side = ?
                """, (rs, row) -> new Document(normalized.toLowerCase(Locale.ROOT), rs.getString("content_type"),
                rs.getBytes("content")), application.userId(), normalized);
        if (found.isEmpty()) throw new NoSuchElementException("El cliente no tiene ese lado del documento.");
        return found.getFirst();
    }

    @Transactional
    public ReviewDetail take(String username, Set<String> authorities, long id) {
        Owned application = reviewable(authorities, id);
        long reviewer = reviewerId(username, application);
        requireStatus(application, Set.of("SUBMITTED"), "La solicitud no está esperando revisión.");
        if (!authorities.contains(reviewPermission(application))) {
            throw new AccessDeniedException("Solo un asesor puede tomar la solicitud para revisarla.");
        }
        jdbc.update("UPDATE applications SET status = 'IN_REVIEW', reviewer_id = ?, updated_at = now() WHERE id = ?",
                reviewer, id);
        event(id, "SUBMITTED", "IN_REVIEW", "Un asesor tomó la solicitud para revisarla.", reviewer);
        return reviewDetail(username, authorities, id);
    }

    /**
     * Decisiones de revisión. En inversiones decide el asesor de inversiones. En créditos el asesor
     * recomienda (o decide solo dentro de su atribución) y el analista, que debe ser otra persona,
     * aprueba o rechaza.
     */
    @Transactional
    public ReviewDetail decide(String username, Set<String> authorities, long id, String decision, String comment) {
        Owned application = reviewable(authorities, id);
        long me = reviewerId(username, application);
        Actions allowed = actions(application, authorities, me);
        String action = decision == null ? "" : decision.toUpperCase(Locale.ROOT);
        String from = application.status();

        switch (action) {
            case "OBSERVE" -> {
                if (!allowed.canObserve()) throw denied(allowed, "No puedes pedir información en este momento.");
                String text = requireComment(comment, "Indica al cliente qué debe corregir o adjuntar (mínimo 10 caracteres).", 10);
                jdbc.update("""
                        UPDATE applications SET status = 'OBSERVED', reviewer_id = ?, decision_comment = ?,
                            updated_at = now() WHERE id = ?
                        """, me, text, id);
                event(id, from, "OBSERVED", text, me);
                IdentityService.Account customer = identity.accountById(application.userId());
                notifier.notifyObserved(customer.email(), customer.fullName(), application.code(),
                        application.productName(), text, id);
            }
            case "RECOMMEND_APPROVE", "RECOMMEND_REJECT" -> {
                if (!allowed.canRecommend()) throw denied(allowed, "No puedes recomendar esta solicitud.");
                String recommendation = action.equals("RECOMMEND_APPROVE") ? "APPROVE" : "REJECT";
                String text = requireComment(comment,
                        "Resume para el analista por qué recomiendas esta decisión (mínimo 10 caracteres).", 10);
                jdbc.update("""
                        UPDATE applications SET status = 'PENDING_APPROVAL', recommendation = ?,
                            recommendation_comment = ?, recommended_by = ?, recommended_at = now(), updated_at = now()
                        WHERE id = ?
                        """, recommendation, text, me, id);
                internalEvent(id, from, "PENDING_APPROVAL", (recommendation.equals("APPROVE")
                        ? "Recomienda aprobar: " : "Recomienda rechazar: ") + text, me);
            }
            case "RETURN" -> {
                if (!allowed.canReturn()) throw denied(allowed, "No puedes devolver esta solicitud.");
                String text = requireComment(comment, "Indica al asesor qué debe revisar (mínimo 10 caracteres).", 10);
                jdbc.update("""
                        UPDATE applications SET status = 'IN_REVIEW', recommendation = NULL,
                            recommendation_comment = NULL, recommended_by = NULL, recommended_at = NULL,
                            updated_at = now() WHERE id = ?
                        """, id);
                internalEvent(id, from, "IN_REVIEW", "Devuelta al asesor: " + text, me);
            }
            case "APPROVE" -> {
                boolean finalDecision = "PENDING_APPROVAL".equals(from);
                if (!(finalDecision ? allowed.canFinalize() : allowed.canDecide())) {
                    throw denied(allowed, "No puedes aprobar esta solicitud.");
                }
                boolean needsReason = "MANUAL_REVIEW".equals(application.biometricResult())
                        || (finalDecision && "REJECT".equals(application.recommendation()));
                String text = needsReason
                        ? requireComment(comment, "MANUAL_REVIEW".equals(application.biometricResult())
                        ? "La biometría no fue concluyente: explica cómo se confirmó la identidad (mínimo 10 caracteres)."
                        : "El asesor recomendó rechazar: justifica la aprobación (mínimo 10 caracteres).", 10)
                        : blankToNull(comment, "Solicitud aprobada.");
                LocalDate today = LocalDate.now();
                int shift = Math.toIntExact(ChronoUnit.DAYS.between(application.scheduleBaseDate(), today));
                jdbc.update("UPDATE application_schedule SET due_date = due_date + ? WHERE application_id = ?", shift, id);
                jdbc.update("""
                        UPDATE applications SET status = 'APPROVED', decided_by = ?, decision_comment = ?,
                            decided_at = now(), schedule_base_date = ?, updated_at = now() WHERE id = ?
                        """, me, text, today, id);
                event(id, from, "APPROVED", finalDecision || !"CREDIT".equals(application.productType()) ? text
                        : text + " (aprobada dentro de la atribución del asesor)", me);
                IdentityService.Account customer = identity.accountById(application.userId());
                notifier.notifyApproved(customer.email(), customer.fullName(), application.code(),
                        application.productName(), id);
            }
            case "REJECT" -> {
                boolean finalDecision = "PENDING_APPROVAL".equals(from);
                if (!(finalDecision ? allowed.canFinalize() : allowed.canDecide())) {
                    throw denied(allowed, "No puedes rechazar esta solicitud.");
                }
                String text = requireComment(comment, "Explica al cliente el motivo del rechazo (mínimo 10 caracteres).", 10);
                jdbc.update("""
                        UPDATE applications SET status = 'REJECTED', decided_by = ?, decision_comment = ?,
                            decided_at = now(), updated_at = now() WHERE id = ?
                        """, me, text, id);
                event(id, from, "REJECTED", text, me);
                IdentityService.Account customer = identity.accountById(application.userId());
                notifier.notifyRejected(customer.email(), customer.fullName(), application.code(),
                        application.productName(), text);
            }
            default -> throw new IllegalArgumentException("La decisión no es válida.");
        }
        return reviewDetail(username, authorities, id);
    }

    /**
     * Se registran en orden (cuota N solo si la N-1 ya está registrada): así el saldo tras el último
     * pago siempre coincide con el `closing_balance` de esa fila del cronograma. No recalcula la
     * tabla ni admite abonos extraordinarios; solo confirma qué cuota del cronograma ya se cobró.
     */
    @Transactional
    public ReviewDetail registerPayment(String username, Set<String> authorities, long id, RegisterPayment input) {
        Owned application = reviewable(authorities, id);
        requireStatus(application, Set.of("APPROVED"), "Solo se registran pagos de solicitudes aprobadas.");
        long actor = identity.accountByUsername(username).id();
        if (actor == application.userId()) {
            throw new AccessDeniedException("No puedes registrar pagos de tu propia solicitud.");
        }

        Integer totalInstallments = jdbc.queryForObject(
                "SELECT count(*) FROM application_schedule WHERE application_id = ?", Integer.class, id);
        Integer paidThrough = jdbc.queryForObject(
                "SELECT COALESCE(max(installment_number), 0) FROM application_payments WHERE application_id = ?",
                Integer.class, id);
        int next = (paidThrough == null ? 0 : paidThrough) + 1;
        if (totalInstallments != null && next > totalInstallments) {
            throw new IllegalStateException("Ya se registraron todas las cuotas del cronograma.");
        }

        BigDecimal amount = input.amount();
        if (amount == null || amount.signum() <= 0) throw new IllegalArgumentException("Ingresa el monto pagado.");
        LocalDate paidAt = input.paidAt() != null ? input.paidAt() : LocalDate.now();
        if (paidAt.isAfter(LocalDate.now())) throw new IllegalArgumentException("La fecha de pago no puede ser futura.");
        String note = input.note() == null || input.note().isBlank() ? null : input.note().trim();
        if (note != null && note.length() > 200) {
            throw new IllegalArgumentException("La nota admite hasta 200 caracteres.");
        }

        jdbc.update("""
                INSERT INTO application_payments (application_id, installment_number, amount, paid_at, note, recorded_by)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, next, amount, paidAt, note, actor);
        jdbc.update("UPDATE applications SET updated_at = now() WHERE id = ?", id);
        return reviewDetail(username, authorities, id);
    }

    /** Solo se puede quitar el último pago registrado, para no dejar huecos en la secuencia. */
    @Transactional
    public ReviewDetail deletePayment(String username, Set<String> authorities, long id, long paymentId) {
        reviewable(authorities, id);
        Integer paidThrough = jdbc.queryForObject(
                "SELECT COALESCE(max(installment_number), 0) FROM application_payments WHERE application_id = ?",
                Integer.class, id);
        Integer targetNumber = jdbc.query(
                "SELECT installment_number FROM application_payments WHERE id = ? AND application_id = ?",
                rs -> rs.next() ? rs.getInt(1) : null, paymentId, id);
        if (targetNumber == null) throw new NoSuchElementException("No encontramos ese pago.");
        if (paidThrough == null || !targetNumber.equals(paidThrough)) {
            throw new IllegalStateException("Solo puedes quitar el último pago registrado (cuota N.º " + paidThrough + ").");
        }
        jdbc.update("DELETE FROM application_payments WHERE id = ?", paymentId);
        jdbc.update("UPDATE applications SET updated_at = now() WHERE id = ?", id);
        return reviewDetail(username, authorities, id);
    }

    private Actions actions(Owned application, Set<String> authorities, long me) {
        boolean credit = "CREDIT".equals(application.productType());
        boolean own = application.userId() == me;
        boolean advisor = authorities.contains(reviewPermission(application));
        boolean analyst = credit && authorities.contains(CREDIT_APPROVE);
        String status = application.status();
        BigDecimal limit = credit ? settings.advisorApprovalLimit() : null;
        boolean withinLimit = credit && limit != null && application.amount().compareTo(limit) <= 0
                && "APPROVED".equals(application.biometricResult());

        if (own) {
            return new Actions(false, false, false, false, false, false, false, limit, withinLimit,
                    "Es una solicitud propia: debe revisarla otra persona.");
        }
        boolean inReview = "IN_REVIEW".equals(status);
        boolean pending = "PENDING_APPROVAL".equals(status);
        boolean recommendedByMe = application.recommendedBy() != null && application.recommendedBy() == me;
        boolean reviewedByMe = application.reviewerId() != null && application.reviewerId() == me;

        boolean canTake = advisor && "SUBMITTED".equals(status);
        boolean canObserve = advisor && inReview;
        boolean canRecommend = advisor && credit && inReview;
        // Inversiones: decide su asesor. Créditos: el asesor solo dentro de su atribución.
        boolean canDecide = advisor && inReview && (!credit || withinLimit);
        boolean canFinalize = analyst && pending && !recommendedByMe && !reviewedByMe;
        boolean canReturn = canFinalize;
        boolean canRegisterPayment = authorities.contains(PAYMENTS_REGISTER) && "APPROVED".equals(status);

        String notice = null;
        if (pending && analyst && (recommendedByMe || reviewedByMe)) {
            notice = "Revisaste esta solicitud como asesor: la decisión final corresponde a otro analista.";
        } else if (pending && !analyst) {
            notice = "Pendiente de la decisión del analista de crédito.";
        } else if (inReview && credit && advisor && !withinLimit) {
            notice = "APPROVED".equals(application.biometricResult())
                    ? "El monto supera tu atribución de aprobación; recomienda una decisión al analista."
                    : "La biometría no fue concluyente: la decisión corresponde al analista.";
        } else if (!advisor && !analyst && authorities.contains(AUDIT)) {
            notice = "Vista de consulta: la administración no decide operaciones individuales.";
        }
        return new Actions(canTake, canObserve, canRecommend, canDecide, canFinalize, canReturn, canRegisterPayment,
                limit, withinLimit, notice);
    }

    private static String reviewPermission(Owned application) {
        return "CREDIT".equals(application.productType()) ? CREDIT_REVIEW : INVESTMENT_REVIEW;
    }

    private static AccessDeniedException denied(Actions actions, String fallback) {
        return new AccessDeniedException(actions.notice() != null ? actions.notice() : fallback);
    }

    // ─── Consultas internas ──────────────────────────────────────────────────

    private List<Summary> summaries(String where, Object... args) {
        return jdbc.query("""
                SELECT a.id, a.code, a.product_type, a.product_id, a.product_name, a.amount, a.term, a.term_unit,
                       a.amortization_system, a.payout_frequency, a.annual_rate, a.periodic_payment, a.total_amount,
                       a.status, a.biometric_result, customer.full_name AS customer_name,
                       reviewer.full_name AS reviewer_name, a.submitted_at, a.decided_at, a.created_at, a.updated_at,
                       next_row.due_date AS next_due_date, next_row.payment AS next_payment,
                       paid.through AS elapsed,
                       (SELECT count(*) FROM application_schedule s WHERE s.application_id = a.id) AS total_rows,
                       COALESCE((SELECT s.closing_balance FROM application_schedule s
                                 WHERE s.application_id = a.id AND s.number = paid.through), a.amount) AS projected_balance
                FROM applications a
                JOIN app_users customer ON customer.id = a.user_id
                LEFT JOIN app_users reviewer ON reviewer.id = a.reviewer_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(max(p.installment_number), 0) AS through
                    FROM application_payments p WHERE p.application_id = a.id
                ) paid ON TRUE
                LEFT JOIN LATERAL (
                    -- "Próxima" se calcula sobre pagos reales, no sobre la fecha: si no se ha registrado
                    -- el pago de una cuota vencida, sigue siendo la próxima a cobrar.
                    SELECT s.due_date, s.payment FROM application_schedule s
                    WHERE s.application_id = a.id AND s.number > paid.through ORDER BY s.number LIMIT 1
                ) next_row ON TRUE
                """ + where + " ORDER BY a.created_at DESC, a.id DESC", this::summary, args);
    }

    private Summary summary(ResultSet rs, int row) throws SQLException {
        return new Summary(rs.getLong("id"), rs.getString("code"), rs.getString("product_type"),
                rs.getLong("product_id"), rs.getString("product_name"), rs.getBigDecimal("amount"),
                rs.getInt("term"), rs.getString("term_unit"), rs.getString("amortization_system"),
                rs.getString("payout_frequency"), rs.getBigDecimal("annual_rate"),
                rs.getBigDecimal("periodic_payment"), rs.getBigDecimal("total_amount"), rs.getString("status"),
                rs.getString("biometric_result"), rs.getString("customer_name"), rs.getString("reviewer_name"),
                rs.getObject("submitted_at", OffsetDateTime.class), rs.getObject("decided_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("next_due_date", LocalDate.class), rs.getBigDecimal("next_payment"),
                rs.getInt("elapsed"), rs.getInt("total_rows"), rs.getBigDecimal("projected_balance"));
    }

    private Detail customerDetail(long id) {
        return detail(id, true);
    }

    /** Para el cliente se ocultan la recomendación interna y los comentarios entre asesor y analista. */
    private Detail detail(long id, boolean forCustomer) {
        List<Detail> found = jdbc.query("""
                SELECT a.*, reviewer.full_name AS reviewer_name, recommender.full_name AS recommender_name,
                       decider.full_name AS decider_name,
                       COALESCE((SELECT max(p.installment_number) FROM application_payments p
                                 WHERE p.application_id = a.id), 0) AS paid_through
                FROM applications a
                LEFT JOIN app_users reviewer ON reviewer.id = a.reviewer_id
                LEFT JOIN app_users recommender ON recommender.id = a.recommended_by
                LEFT JOIN app_users decider ON decider.id = a.decided_by
                WHERE a.id = ?
                """, (rs, row) -> new Detail(rs.getLong("id"), rs.getString("code"), rs.getString("product_type"),
                rs.getLong("product_id"), rs.getString("product_name"), rs.getBigDecimal("amount"), rs.getInt("term"),
                rs.getString("term_unit"), rs.getString("amortization_system"), rs.getString("payout_frequency"),
                rs.getBigDecimal("asset_cost"), rs.getBigDecimal("annual_rate"), rs.getBigDecimal("periodic_payment"),
                rs.getBigDecimal("total_interest"), rs.getBigDecimal("total_insurance"),
                rs.getBigDecimal("total_charges"), rs.getBigDecimal("total_withholding"),
                rs.getBigDecimal("total_amount"), rs.getBigDecimal("monthly_income"), rs.getString("purpose"),
                rs.getString("status"), rs.getString("biometric_result"),
                Math.max(0, MAX_BIOMETRIC_ATTEMPTS - rs.getInt("biometric_attempts")),
                rs.getString("reviewer_name"), rs.getString("decision_comment"),
                rs.getObject("schedule_base_date", LocalDate.class),
                rs.getObject("submitted_at", OffsetDateTime.class), rs.getObject("decided_at", OffsetDateTime.class),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("updated_at", OffsetDateTime.class),
                ScenarioCalculator.parseOptionalCharges(rs.getString("optional_charges")),
                forCustomer ? null : rs.getString("recommendation"),
                forCustomer ? null : rs.getString("recommendation_comment"),
                forCustomer ? null : rs.getString("recommender_name"),
                forCustomer ? null : rs.getObject("recommended_at", OffsetDateTime.class),
                rs.getString("decider_name"),
                schedule(id), events(id, forCustomer), documents(id), rs.getInt("paid_through"), payments(id)), id);
        if (found.isEmpty()) throw new NoSuchElementException("No encontramos la solicitud.");
        return found.getFirst();
    }

    private List<PaymentRecord> payments(long id) {
        return jdbc.query("""
                SELECT p.id, p.installment_number, p.amount, p.paid_at, p.note, p.recorded_at, u.full_name AS recorded_by_name
                FROM application_payments p JOIN app_users u ON u.id = p.recorded_by
                WHERE p.application_id = ? ORDER BY p.installment_number
                """, (rs, row) -> new PaymentRecord(rs.getLong("id"), rs.getInt("installment_number"),
                rs.getBigDecimal("amount"), rs.getObject("paid_at", LocalDate.class), rs.getString("note"),
                rs.getString("recorded_by_name"), rs.getObject("recorded_at", OffsetDateTime.class)), id);
    }

    private List<ScenarioCalculator.Installment> schedule(long id) {
        return jdbc.query("""
                SELECT number, due_date, opening_balance, principal, interest, insurance, charges, withholding,
                       payment, closing_balance
                FROM application_schedule WHERE application_id = ? ORDER BY number
                """, (rs, row) -> new ScenarioCalculator.Installment(rs.getInt("number"),
                rs.getObject("due_date", LocalDate.class), rs.getBigDecimal("opening_balance"),
                rs.getBigDecimal("principal"), rs.getBigDecimal("interest"), rs.getBigDecimal("insurance"),
                rs.getBigDecimal("charges"), rs.getBigDecimal("withholding"), rs.getBigDecimal("payment"),
                rs.getBigDecimal("closing_balance")), id);
    }

    private List<Event> events(long id, boolean forCustomer) {
        return jdbc.query("""
                SELECT e.from_status, e.to_status, e.created_at, actor.full_name,
                       CASE WHEN e.internal AND ? THEN NULL ELSE e.comment END AS comment,
                       (e.actor_id = a.user_id) AS by_customer
                FROM application_events e
                JOIN applications a ON a.id = e.application_id
                LEFT JOIN app_users actor ON actor.id = e.actor_id
                WHERE e.application_id = ? ORDER BY e.created_at, e.id
                """, (rs, row) -> new Event(rs.getString("from_status"), rs.getString("to_status"),
                rs.getString("comment"), rs.getString("full_name"), rs.getBoolean("by_customer"),
                rs.getObject("created_at", OffsetDateTime.class)), forCustomer, id);
    }

    private List<DocumentInfo> documents(long id) {
        return jdbc.query("""
                SELECT d.id, d.file_name, d.content_type, d.size_bytes, d.uploaded_at,
                       (d.uploaded_by = a.user_id) AS by_customer
                FROM application_documents d JOIN applications a ON a.id = d.application_id
                WHERE d.application_id = ? ORDER BY d.uploaded_at, d.id
                """, (rs, row) -> new DocumentInfo(rs.getLong("id"), rs.getString("file_name"),
                rs.getString("content_type"), rs.getInt("size_bytes"), rs.getBoolean("by_customer"),
                rs.getObject("uploaded_at", OffsetDateTime.class)), id);
    }

    private Document document(long id, long documentId) {
        List<Document> found = jdbc.query("""
                SELECT file_name, content_type, content FROM application_documents WHERE id = ? AND application_id = ?
                """, (rs, row) -> new Document(rs.getString("file_name"), rs.getString("content_type"),
                rs.getBytes("content")), documentId, id);
        if (found.isEmpty()) throw new NoSuchElementException("No encontramos el documento.");
        return found.getFirst();
    }

    private CustomerFile customerFile(long userId, long currentApplication) {
        IdentityService.Account account = identity.accountById(userId);
        CustomerProfile profile = profiles.findByUserId(userId).orElse(null);
        CustomerBiometric biometric = biometrics.findByUserId(userId).orElse(null);
        List<String> sides = jdbc.queryForList("SELECT document_side FROM identity_documents WHERE user_id = ?",
                String.class, userId);
        List<Summary> others = new ArrayList<>(summaries("WHERE a.user_id = ? AND a.id <> ? AND a.status <> 'DRAFT'",
                userId, currentApplication));
        return new CustomerFile(userId, account.fullName(), account.username(), account.email(),
                profile == null ? null : profile.getIdType(), profile == null ? null : profile.getIdNumber(),
                profile == null ? null : profile.getBirthDate(), profile == null ? null : profile.getPhone(),
                profile == null ? null : profile.getAddress(), identity.emailVerified(userId),
                biometric == null ? null : biometric.getEnrolledAt(), sides.contains("FRONT"), sides.contains("BACK"),
                others);
    }

    private Owned owned(String username, long id) {
        long userId = identity.accountByUsername(username).id();
        Owned application = load(id);
        // Se responde igual que si no existiera para no revelar solicitudes ajenas.
        if (application.userId() != userId) throw new NoSuchElementException("No encontramos la solicitud.");
        return application;
    }

    private Owned reviewable(Set<String> authorities, long id) {
        Owned application = load(id);
        if (!reviewableTypes(authorities).contains(application.productType()) || "DRAFT".equals(application.status())) {
            throw new NoSuchElementException("No encontramos la solicitud.");
        }
        return application;
    }

    private Owned load(long id) {
        List<Owned> found = jdbc.query("""
                SELECT id, user_id, product_type, status, biometric_session_id, biometric_attempts, biometric_result,
                       schedule_base_date, amount, reviewer_id, recommended_by, recommendation, code, product_name
                FROM applications WHERE id = ? FOR UPDATE
                """, (rs, row) -> new Owned(rs.getLong("id"), rs.getLong("user_id"), rs.getString("product_type"),
                rs.getString("status"), rs.getString("biometric_session_id"), rs.getInt("biometric_attempts"),
                rs.getString("biometric_result"), rs.getObject("schedule_base_date", LocalDate.class),
                rs.getBigDecimal("amount"), rs.getObject("reviewer_id", Long.class),
                rs.getObject("recommended_by", Long.class), rs.getString("recommendation"), rs.getString("code"),
                rs.getString("product_name")), id);
        if (found.isEmpty()) throw new NoSuchElementException("No encontramos la solicitud.");
        return found.getFirst();
    }

    private long reviewerId(String username, Owned application) {
        long reviewer = identity.accountByUsername(username).id();
        if (reviewer == application.userId()) {
            throw new AccessDeniedException("No puedes revisar una solicitud propia.");
        }
        return reviewer;
    }

    /** Tipos de solicitud que la persona puede ver (revisar, aprobar o consultar). */
    public static List<String> reviewableTypes(Set<String> authorities) {
        List<String> types = new ArrayList<>();
        boolean audit = authorities.contains(AUDIT);
        if (audit || authorities.contains(CREDIT_REVIEW) || authorities.contains(CREDIT_APPROVE)) types.add("CREDIT");
        if (audit || authorities.contains(INVESTMENT_REVIEW)) types.add("INVESTMENT");
        return types;
    }

    private void changeStatus(long id, String from, String to, String comment, long actor) {
        jdbc.update("UPDATE applications SET status = ?, updated_at = now() WHERE id = ?", to, id);
        event(id, from, to, comment, actor);
    }

    private void event(long id, String from, String to, String comment, long actor) {
        jdbc.update("""
                INSERT INTO application_events (application_id, from_status, to_status, comment, actor_id)
                VALUES (?, ?, ?, ?, ?)
                """, id, from, to, comment, actor);
    }

    private void internalEvent(long id, String from, String to, String comment, long actor) {
        jdbc.update("""
                INSERT INTO application_events (application_id, from_status, to_status, comment, actor_id, internal)
                VALUES (?, ?, ?, ?, ?, TRUE)
                """, id, from, to, comment, actor);
    }

    private static void requireStatus(Owned application, Set<String> allowed, String message) {
        if (!allowed.contains(application.status())) throw new IllegalStateException(message);
    }

    private static String requireComment(String comment, String message, int minimum) {
        String text = comment == null ? "" : comment.trim();
        if (text.length() < minimum) throw new IllegalArgumentException(message);
        if (text.length() > 600) throw new IllegalArgumentException("El comentario admite hasta 600 caracteres.");
        return text;
    }

    private static String blankToNull(String comment, String fallback) {
        if (comment == null || comment.isBlank()) return fallback;
        String text = comment.trim();
        if (text.length() > 600) throw new IllegalArgumentException("El comentario admite hasta 600 caracteres.");
        return text;
    }

    private static boolean matchesSignature(String type, byte[] content) {
        return switch (type) {
            case "application/pdf" -> content.length > 4 && content[0] == '%' && content[1] == 'P'
                    && content[2] == 'D' && content[3] == 'F';
            case "image/png" -> content.length > 8 && (content[0] & 0xFF) == 0x89 && content[1] == 'P'
                    && content[2] == 'N' && content[3] == 'G';
            case "image/jpeg" -> content.length > 3 && (content[0] & 0xFF) == 0xFF && (content[1] & 0xFF) == 0xD8;
            default -> false;
        };
    }
}
