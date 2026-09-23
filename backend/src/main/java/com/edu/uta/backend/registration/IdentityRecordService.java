package com.edu.uta.backend.registration;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;

import com.edu.uta.backend.verification.BiometricVerification;
import com.edu.uta.backend.verification.BiometricVerificationRepository;
import com.edu.uta.backend.verification.CustomerBiometric;
import com.edu.uta.backend.verification.CustomerBiometricRepository;
import com.edu.uta.backend.verification.FaceService;
import com.edu.uta.backend.verification.IdentityDocument;
import com.edu.uta.backend.verification.IdentityDocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Guarda el expediente de una identidad ya verificada (fotos del documento, resultado de la prueba de
 * vida y plantilla del rostro). Lo usan el registro y la actualización del documento desde Mi perfil.
 */
@Service
public class IdentityRecordService {

    /** Versión del texto de autorización biométrica que se acepta al iniciar el registro. */
    private static final String CONSENT_VERSION = "biometria-2026-09";
    private static final String ALGORITHM = "aws-rekognition";

    private final IdentityDocumentRepository documents;
    private final BiometricVerificationRepository verifications;
    private final CustomerBiometricRepository biometrics;
    private final FaceService faces;

    public IdentityRecordService(IdentityDocumentRepository documents, BiometricVerificationRepository verifications,
                                 CustomerBiometricRepository biometrics, FaceService faces) {
        this.documents = documents;
        this.verifications = verifications;
        this.biometrics = biometrics;
        this.faces = faces;
    }

    /**
     * Rekognition no participa de la transacción: la plantilla anterior se borra solo si todo se
     * confirma, y la nueva se retira si algo falla después (por ejemplo, el envío del correo).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void store(long userId, IdentityCheckService.Evidence evidence, String operation) {
        saveDocument(userId, "FRONT", evidence.frontType(), evidence.front());
        saveDocument(userId, "BACK", evidence.backType(), evidence.back());
        verifications.save(new BiometricVerification(userId, operation, null, evidence.sessionId(),
                scale(evidence.livenessConfidence()), scale(evidence.similarity()), "APPROVED"));

        FaceService.Enrollment enrollment = faces.enroll(evidence.front(), userId);
        CustomerBiometric existing = biometrics.findByUserId(userId).orElse(null);
        String previousCollection = existing == null ? null : existing.getCollectionId();
        String previousFace = existing == null ? null : existing.getFaceId();
        if (existing == null) {
            biometrics.save(new CustomerBiometric(userId, enrollment.collectionId(), enrollment.faceId(),
                    ALGORITHM, Instant.now(), CONSENT_VERSION));
        } else {
            existing.replaceFace(enrollment.collectionId(), enrollment.faceId(), Instant.now(), CONSENT_VERSION);
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED && previousFace != null) {
                    faces.forget(previousCollection, previousFace);
                } else if (status != STATUS_COMMITTED) {
                    faces.forget(enrollment.collectionId(), enrollment.faceId());
                }
            }
        });
    }

    /** El documento viene en mayúsculas ("GARCIA ABATA"); en la cuenta se muestra como nombre propio. */
    public static String properName(String value) {
        StringBuilder name = new StringBuilder();
        for (String word : value.trim().toLowerCase(Locale.ROOT).split("\\s+")) {
            if (!name.isEmpty()) name.append(' ');
            name.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return name.toString();
    }

    private void saveDocument(long userId, String side, String contentType, byte[] content) {
        documents.findByUserIdAndDocumentSide(userId, side).ifPresentOrElse(existing -> {
            existing.replaceContent(contentType, content);
            existing.markStatus("ACCEPTED");
        }, () -> {
            IdentityDocument document = new IdentityDocument(userId, side, contentType, content);
            document.markStatus("ACCEPTED");
            documents.save(document);
        });
    }

    private BigDecimal scale(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
