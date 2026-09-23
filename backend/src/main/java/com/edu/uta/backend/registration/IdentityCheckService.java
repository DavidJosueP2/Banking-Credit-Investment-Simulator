package com.edu.uta.backend.registration;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;

import com.edu.uta.backend.identity.EcuadorianId;
import com.edu.uta.backend.verification.AwsProperties;
import com.edu.uta.backend.verification.CustomerBiometricRepository;
import com.edu.uta.backend.verification.DocumentOcrService;
import com.edu.uta.backend.verification.FaceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpSession;
import software.amazon.awssdk.services.sts.StsClient;

/**
 * Verifica una identidad: el documento (número, código dactilar o vencimiento y fotos de ambas caras)
 * y una prueba de vida contra la foto del documento. Sirve para registrarse (sin titular) y para que
 * un cliente actualice su documento (titular = su cuenta, y su rostro debe coincidir con el registrado).
 * El avance vive en la sesión HTTP para que el navegador no pueda saltarse un paso ni reutilizar la
 * prueba de vida de otra persona.
 */
@Service
public class IdentityCheckService {

    static final String ATTEMPT = IdentityCheckService.class.getName() + ".ATTEMPT";
    /** Cada análisis cuesta una llamada a Textract o Rekognition: se limita por sesión. */
    private static final int MAX_ANALYSES = 12;
    private static final int MAX_LIVENESS = 3;
    private static final int CREDENTIALS_SECONDS = 900;
    /** Las credenciales que viajan a un navegador anónimo solo sirven para abrir la prueba de vida. */
    private static final String LIVENESS_ONLY_POLICY = """
            {"Version":"2012-10-17","Statement":[{"Effect":"Allow",\
            "Action":"rekognition:StartFaceLivenessSession","Resource":"*"}]}""";

    private final DocumentOcrService ocr;
    private final FaceService faces;
    private final CustomerProfileRepository profiles;
    private final CustomerBiometricRepository biometrics;
    private final StsClient sts;
    private final AwsProperties properties;
    private final double minLiveness;
    private final double documentSimilarity;

    public IdentityCheckService(DocumentOcrService ocr, FaceService faces, CustomerProfileRepository profiles,
                                CustomerBiometricRepository biometrics, StsClient sts, AwsProperties properties,
                                @Value("${app.biometrics.min-liveness:75}") double minLiveness,
                                @Value("${app.biometrics.document-similarity:95}") double documentSimilarity) {
        this.ocr = ocr;
        this.faces = faces;
        this.profiles = profiles;
        this.biometrics = biometrics;
        this.sts = sts;
        this.properties = properties;
        this.minLiveness = minLiveness;
        this.documentSimilarity = documentSimilarity;
    }

    /** Lo que la persona escribió: la cédula lleva código dactilar y el pasaporte su fecha de vencimiento. */
    public record Claim(String idType, String idNumber, String fingerprintCode, LocalDate expiryDate) {

        String key() {
            return idType + "|" + idNumber + "|" + fingerprintCode + "|" + expiryDate;
        }
    }

    /** Lo que se leyó de una cara del documento; los datos personales solo vienen en el anverso. */
    record DocumentReview(String side, String idNumber, String firstNames, String lastNames, LocalDate birthDate) {}

    public record LivenessTicket(String sessionId, String region, String accessKeyId, String secretAccessKey,
                                 String sessionToken, String expiration) {}

    public record VerifiedIdentity(String idType, String idNumber, String firstNames, String lastNames,
                                   LocalDate birthDate) {}

    /** Al navegador solo le llega el veredicto: los puntajes ayudarían a afinar un ataque. */
    public record Outcome(String result, String detail, VerifiedIdentity identity) {}

    /** Lo que se guarda en el expediente cuando la verificación se aprueba. */
    public record Evidence(VerifiedIdentity identity, String frontType, byte[] front, String backType, byte[] back,
                           String sessionId, double livenessConfidence, double similarity) {}

    static class Attempt implements Serializable {
        @Serial
        private static final long serialVersionUID = 1L;
        /** Cuenta que actualiza su documento; null durante el registro. */
        Long owner;
        String frontKey;
        String backKey;
        byte[] front;
        String frontType;
        byte[] back;
        String backType;
        String firstNames;
        String lastNames;
        LocalDate birthDate;
        String livenessKey;
        String livenessSessionId;
        String verifiedSessionId;
        double livenessConfidence;
        double similarity;
        int analyses;
        int livenessTries;
    }

    public void analyze(HttpSession session, Long owner, Claim rawClaim, String rawSide,
                                  String contentType, byte[] content) {
        Claim claim = normalize(rawClaim);
        String side = rawSide == null ? "" : rawSide.trim().toUpperCase(Locale.ROOT);
        if (!side.equals("FRONT") && !side.equals("BACK")) {
            throw new IllegalArgumentException("El lado del documento no es válido");
        }
        validateImage(contentType, content);
        ensureAvailable(claim, owner);
        Attempt attempt = countAnalysis(session, owner);

        DocumentReview review;
        if (claim.idType().equals("CEDULA")) {
            review = side.equals("FRONT") ? cedulaFront(claim, content) : cedulaBack(claim, content);
        } else {
            review = side.equals("FRONT") ? passportFront(claim, content) : passportBack(attempt, claim, content);
        }

        if (side.equals("FRONT")) {
            attempt.frontKey = claim.key();
            attempt.front = content;
            attempt.frontType = contentType;
            attempt.firstNames = review.firstNames();
            attempt.lastNames = review.lastNames();
            attempt.birthDate = review.birthDate();
        } else {
            attempt.backKey = claim.key();
            attempt.back = content;
            attempt.backType = contentType;
        }
        attempt.livenessSessionId = null;
        attempt.verifiedSessionId = null;
        session.setAttribute(ATTEMPT, attempt);
    }

    private DocumentReview cedulaFront(Claim claim, byte[] content) {
        DocumentOcrService.CedulaData data = ocr.read(content);
        if (!data.idNumber().equals(claim.idNumber())) {
            throw new IllegalArgumentException("La cédula de la foto no coincide con el número que ingresaste.");
        }
        faces.assertUsableFace(content);
        return new DocumentReview("FRONT", data.idNumber(), data.firstNames(), data.lastNames(), data.birthDate());
    }

    private DocumentReview cedulaBack(Claim claim, byte[] content) {
        DocumentOcrService.CedulaBack back = ocr.readCedulaBack(content, claim.fingerprintCode());
        if (back.idNumber() != null && !back.idNumber().equals(claim.idNumber())) {
            throw new IllegalArgumentException("Este reverso es de otra cédula. Sube el reverso de la cédula ingresada.");
        }
        switch (back.fingerprint()) {
            case MATCH -> { }
            case MISMATCH -> throw new IllegalArgumentException(
                    "El código dactilar del reverso no coincide con el que ingresaste.");
            case NOT_FOUND -> throw new IllegalArgumentException(
                    "No encontramos el código dactilar en la foto. Asegúrate de que el reverso se vea completo y nítido.");
        }
        return new DocumentReview("BACK", claim.idNumber(), null, null, null);
    }

    private DocumentReview passportFront(Claim claim, byte[] content) {
        DocumentOcrService.PassportData data = ocr.readPassport(content);
        if (!data.number().equals(claim.idNumber())) {
            throw new IllegalArgumentException("El número del pasaporte de la foto no coincide con el que ingresaste.");
        }
        if (!data.expiryDate().equals(claim.expiryDate())) {
            throw new IllegalArgumentException("La fecha de vencimiento del pasaporte no coincide con la que ingresaste.");
        }
        if (data.expiryDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("El pasaporte está vencido. Regístrate con un documento vigente.");
        }
        faces.assertUsableFace(content);
        return new DocumentReview("FRONT", data.number(), data.firstNames(), data.lastNames(), data.birthDate());
    }

    /** El reverso del pasaporte no trae datos legibles por máquina: se guarda como respaldo del expediente. */
    private DocumentReview passportBack(Attempt attempt, Claim claim, byte[] content) {
        if (attempt.front != null && Arrays.equals(attempt.front, content)) {
            throw new IllegalArgumentException("Subiste la misma foto en ambos lados. Sube la otra página del pasaporte.");
        }
        return new DocumentReview("BACK", claim.idNumber(), null, null, null);
    }

    public LivenessTicket startLiveness(HttpSession session, Long owner, Claim rawClaim) {
        Claim claim = normalize(rawClaim);
        Attempt attempt = existing(session, owner);
        if (attempt == null || attempt.front == null || !claim.key().equals(attempt.frontKey)) {
            throw new IllegalArgumentException("Sube el anverso del documento que corresponde a los datos ingresados.");
        }
        if (attempt.back == null || !claim.key().equals(attempt.backKey)) {
            throw new IllegalArgumentException("Sube el reverso del documento que corresponde a los datos ingresados.");
        }
        if (attempt.livenessTries >= MAX_LIVENESS) {
            throw new IllegalStateException("Superaste los intentos de verificación facial. Vuelve a intentarlo más tarde.");
        }
        ensureAvailable(claim, owner);

        attempt.livenessTries++;
        attempt.livenessKey = claim.key();
        attempt.livenessSessionId = faces.startLivenessSession();
        attempt.verifiedSessionId = null;
        session.setAttribute(ATTEMPT, attempt);

        var credentials = sts.getFederationToken(request -> request
                .name("brunexa-liveness")
                .policy(LIVENESS_ONLY_POLICY)
                .durationSeconds(CREDENTIALS_SECONDS)).credentials();
        return new LivenessTicket(attempt.livenessSessionId, properties.region(), credentials.accessKeyId(),
                credentials.secretAccessKey(), credentials.sessionToken(), credentials.expiration().toString());
    }

    /** La sesión de liveness es de un solo uso: se consume aunque el resultado sea negativo. */
    public Outcome complete(HttpSession session, Long owner, String sessionId) {
        Attempt attempt = existing(session, owner);
        if (attempt == null || attempt.livenessSessionId == null || !attempt.livenessSessionId.equals(sessionId)) {
            throw new IllegalArgumentException("La verificación facial expiró. Vuelve a iniciarla.");
        }
        attempt.livenessSessionId = null;
        session.setAttribute(ATTEMPT, attempt);

        FaceService.LivenessResult liveness = faces.livenessResult(sessionId);
        if (!"SUCCEEDED".equals(liveness.status())) {
            return rejected("La prueba de vida no se completó. Inténtalo de nuevo.");
        }
        if (liveness.confidence() < minLiveness) {
            return rejected("No pudimos confirmar que seas una persona real. Busca más luz, quítate lentes o gorra "
                    + "y vuelve a intentarlo.");
        }
        if (liveness.referenceImage() == null) {
            return rejected("La cámara no entregó una imagen utilizable. Inténtalo de nuevo.");
        }
        double similarity = faces.compare(liveness.referenceImage(), attempt.front);
        if (similarity < documentSimilarity) {
            return rejected("Tu rostro no coincide con la foto del documento que subiste.");
        }
        if (owner != null && !matchesEnrolledFace(owner, liveness.referenceImage())) {
            return rejected("Tu rostro no coincide con el registrado en tu cuenta.");
        }

        attempt.verifiedSessionId = sessionId;
        attempt.livenessConfidence = liveness.confidence();
        attempt.similarity = similarity;
        session.setAttribute(ATTEMPT, attempt);
        return new Outcome("APPROVED", "Identidad confirmada", identity(attempt));
    }

    /** Lo verificado en esta sesión; sin prueba de vida aprobada no hay cuenta. */
    public Evidence evidence(HttpSession session, Long owner) {
        Attempt attempt = existing(session, owner);
        if (attempt == null || attempt.verifiedSessionId == null) {
            throw new IllegalArgumentException("Primero confirma tu identidad con tu documento y tu rostro.");
        }
        return new Evidence(identity(attempt), attempt.frontType, attempt.front, attempt.backType, attempt.back,
                attempt.verifiedSessionId, attempt.livenessConfidence, attempt.similarity);
    }

    public void finish(HttpSession session) {
        session.removeAttribute(ATTEMPT);
    }

    private VerifiedIdentity identity(Attempt attempt) {
        String[] parts = attempt.livenessKey.split("\\|", -1);
        return new VerifiedIdentity(parts[0], parts[1], attempt.firstNames, attempt.lastNames, attempt.birthDate);
    }

    /** Sin esto, alguien con la sesión abierta de otra persona podría cambiarle la identidad por la suya. */
    private boolean matchesEnrolledFace(long owner, byte[] liveFace) {
        return biometrics.findByUserId(owner)
                .flatMap(enrolled -> faces.search(liveFace, (float) documentSimilarity)
                        .filter(match -> match.faceId().equals(enrolled.getFaceId())))
                .isPresent();
    }

    private Outcome rejected(String detail) {
        return new Outcome("REJECTED", detail, null);
    }

    /** El documento no puede pertenecer a otra cuenta; al actualizar, sí puede ser el mismo del titular. */
    private void ensureAvailable(Claim claim, Long owner) {
        profiles.findByIdTypeAndIdNumber(claim.idType(), claim.idNumber())
                .filter(profile -> !profile.getUserId().equals(owner))
                .ifPresent(profile -> {
                    throw new IllegalArgumentException(owner == null
                            ? "Este documento ya tiene una cuenta en Brunexa. Ingresa con tu usuario."
                            : "Este documento pertenece a otra cuenta.");
                });
    }

    private Claim normalize(Claim claim) {
        if (claim == null) throw new IllegalArgumentException("Ingresa tu documento");
        String idType = claim.idType() == null ? "" : claim.idType().trim().toUpperCase(Locale.ROOT);
        String idNumber = claim.idNumber() == null ? "" : claim.idNumber().trim().toUpperCase(Locale.ROOT);
        if (idType.equals("CEDULA")) {
            if (!EcuadorianId.valid(idNumber)) throw new IllegalArgumentException("La cédula no es válida");
            String code = DocumentOcrService.normalizeFingerprintCode(claim.fingerprintCode());
            if (code == null) {
                throw new IllegalArgumentException(
                        "El código dactilar tiene una letra, cuatro números, una letra y cuatro números (ej. V1234V1234).");
            }
            return new Claim(idType, idNumber, code, null);
        }
        if (idType.equals("PASAPORTE")) {
            if (!idNumber.matches("[A-Z0-9]{6,20}")) throw new IllegalArgumentException("El pasaporte no es válido");
            if (claim.expiryDate() == null) {
                throw new IllegalArgumentException("Ingresa la fecha de vencimiento del pasaporte");
            }
            return new Claim(idType, idNumber, null, claim.expiryDate());
        }
        throw new IllegalArgumentException("El tipo de documento no es válido");
    }

    /** Un avance ajeno (registro frente a actualización, u otra cuenta) no cuenta como propio. */
    private Attempt existing(HttpSession session, Long owner) {
        return session.getAttribute(ATTEMPT) instanceof Attempt attempt && Objects.equals(attempt.owner, owner)
                ? attempt : null;
    }

    private Attempt countAnalysis(HttpSession session, Long owner) {
        Attempt attempt = existing(session, owner);
        if (attempt == null) {
            attempt = new Attempt();
            attempt.owner = owner;
        }
        if (attempt.analyses >= MAX_ANALYSES) {
            throw new IllegalStateException("Superaste los intentos permitidos. Vuelve a intentarlo más tarde.");
        }
        attempt.analyses++;
        session.setAttribute(ATTEMPT, attempt);
        return attempt;
    }

    private void validateImage(String contentType, byte[] content) {
        if (content == null || content.length == 0) throw new IllegalArgumentException("El archivo está vacío");
        if (content.length > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("La imagen supera los 5 MB permitidos");
        }
        if (contentType == null || !(contentType.equals("image/jpeg") || contentType.equals("image/png"))) {
            throw new IllegalArgumentException("Sube la imagen en formato JPG o PNG");
        }
    }
}
