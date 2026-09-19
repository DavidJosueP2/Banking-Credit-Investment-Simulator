package com.edu.uta.backend.verification;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.NoSuchElementException;
import java.util.Optional;

import com.edu.uta.backend.identity.IdentityService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Verificación biométrica de paso elevado. Nunca decide sola: cuando el parecido no es
 * concluyente devuelve MANUAL_REVIEW, como exige el Art. 16 de la norma de datos biométricos.
 */
@Service
public class LivenessService {

    private final FaceService faces;
    private final CustomerBiometricRepository biometrics;
    private final BiometricVerificationRepository verifications;
    private final IdentityService identity;
    private final double minLiveness;
    private final double approveSimilarity;
    private final double reviewSimilarity;

    public LivenessService(FaceService faces, CustomerBiometricRepository biometrics,
                           BiometricVerificationRepository verifications, IdentityService identity,
                           @Value("${app.biometrics.min-liveness:75}") double minLiveness,
                           @Value("${app.biometrics.approve-similarity:99}") double approveSimilarity,
                           @Value("${app.biometrics.review-similarity:90}") double reviewSimilarity) {
        this.faces = faces;
        this.biometrics = biometrics;
        this.verifications = verifications;
        this.identity = identity;
        this.minLiveness = minLiveness;
        this.approveSimilarity = approveSimilarity;
        this.reviewSimilarity = reviewSimilarity;
    }

    public record Outcome(String result, Double livenessConfidence, Double matchSimilarity, String detail) {}

    public String startSession(String username) {
        requireEnrollment(username);
        return faces.startLivenessSession();
    }

    @Transactional
    public Outcome verify(String username, String sessionId, String operationType, Long operationId) {
        CustomerBiometric enrolled = requireEnrollment(username);
        FaceService.LivenessResult liveness = faces.livenessResult(sessionId);

        if (!"SUCCEEDED".equals(liveness.status())) {
            return record(enrolled.getUserId(), operationType, operationId, sessionId, null, null,
                    "REJECTED", "La prueba de vida no se completó (" + liveness.status() + ")");
        }
        if (liveness.confidence() < minLiveness) {
            return record(enrolled.getUserId(), operationType, operationId, sessionId,
                    liveness.confidence(), null, "REJECTED",
                    "No pudimos confirmar que seas una persona real. Busca un lugar con más luz, quítate "
                            + "lentes o gorra y vuelve a intentarlo.");
        }
        if (liveness.referenceImage() == null) {
            return record(enrolled.getUserId(), operationType, operationId, sessionId,
                    liveness.confidence(), null, "MANUAL_REVIEW", "La sesión no devolvió imagen de referencia");
        }

        Optional<FaceService.Match> match = faces.search(liveness.referenceImage(),
                (float) reviewSimilarity);
        if (match.isEmpty() || !match.get().faceId().equals(enrolled.getFaceId())) {
            return record(enrolled.getUserId(), operationType, operationId, sessionId,
                    liveness.confidence(), match.map(FaceService.Match::similarity).orElse(null),
                    "REJECTED", "El rostro no corresponde al registrado en tu cuenta");
        }

        double similarity = match.get().similarity();
        String result = similarity >= approveSimilarity ? "APPROVED"
                : similarity >= reviewSimilarity ? "MANUAL_REVIEW" : "REJECTED";
        String detail = switch (result) {
            case "APPROVED" -> "Identidad confirmada";
            case "MANUAL_REVIEW" -> "Parecido no concluyente: pasa a revisión de un asesor";
            default -> "El rostro no corresponde al registrado en tu cuenta";
        };
        return record(enrolled.getUserId(), operationType, operationId, sessionId,
                liveness.confidence(), similarity, result, detail);
    }

    private Outcome record(long userId, String operationType, Long operationId, String sessionId,
                           Double liveness, Double similarity, String result, String detail) {
        verifications.save(new BiometricVerification(userId, operationType, operationId, sessionId,
                scale(liveness), scale(similarity), result));
        return new Outcome(result, liveness, similarity, detail);
    }

    private BigDecimal scale(Double value) {
        return value == null ? null : BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private CustomerBiometric requireEnrollment(String username) {
        long userId = identity.accountByUsername(username).id();
        return biometrics.findByUserId(userId).orElseThrow(() -> new NoSuchElementException(
                "Primero registra tu rostro subiendo el anverso de tu cédula desde Mi perfil"));
    }
}
