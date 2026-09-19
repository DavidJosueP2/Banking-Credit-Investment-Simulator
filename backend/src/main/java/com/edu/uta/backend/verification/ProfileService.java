package com.edu.uta.backend.verification;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;

import com.edu.uta.backend.identity.IdentityService;
import com.edu.uta.backend.registration.CustomerProfile;
import com.edu.uta.backend.registration.CustomerProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private static final String CONSENT_VERSION = "biometria-2026-09";
    private static final String ALGORITHM = "aws-rekognition";
    private static final List<String> SIDES = List.of("FRONT", "BACK");

    private final CustomerProfileRepository profiles;
    private final IdentityDocumentRepository documents;
    private final CustomerBiometricRepository biometrics;
    private final DocumentOcrService ocr;
    private final FaceService faces;
    private final IdentityService identity;

    public ProfileService(CustomerProfileRepository profiles, IdentityDocumentRepository documents,
                          CustomerBiometricRepository biometrics, DocumentOcrService ocr,
                          FaceService faces, IdentityService identity) {
        this.profiles = profiles;
        this.documents = documents;
        this.biometrics = biometrics;
        this.ocr = ocr;
        this.faces = faces;
        this.identity = identity;
    }

    public record ProfileView(String idType, String idNumber, String firstNames, String lastNames,
                              LocalDate birthDate, String phone, String address, boolean emailVerified,
                              String documentStatus, boolean backUploaded, boolean biometricEnrolled) {}

    public record DocumentReview(String idNumber, String firstNames, String lastNames, LocalDate birthDate,
                                 boolean matchesProfile, boolean faceEnrolled, List<String> differences) {}

    public record StoredImage(byte[] content, String contentType) {}

    public ProfileView profile(String username) {
        CustomerProfile profile = profileOf(username);
        String status = documents.findByUserIdAndDocumentSide(profile.getUserId(), "FRONT")
                .map(IdentityDocument::getStatus).orElse("NONE");
        boolean back = documents.findByUserIdAndDocumentSide(profile.getUserId(), "BACK").isPresent();
        boolean enrolled = biometrics.findByUserId(profile.getUserId()).isPresent();
        return new ProfileView(profile.getIdType(), profile.getIdNumber(), profile.getFirstNames(),
                profile.getLastNames(), profile.getBirthDate(), profile.getPhone(), profile.getAddress(),
                profile.isEmailVerified(), status, back, enrolled);
    }

    @Transactional
    public ProfileView updateContact(String username, String phone, String address) {
        CustomerProfile profile = profileOf(username);
        profile.setPhone(normalizePhone(phone));
        profile.setAddress(address == null || address.isBlank() ? null : address.trim());
        return profile(username);
    }

    @Transactional
    public DocumentReview uploadDocument(String username, String side, String contentType, byte[] content,
                                         boolean biometricConsent) {
        String documentSide = normalizeSide(side);
        CustomerProfile profile = profileOf(username);
        validateImage(contentType, content);

        if (documentSide.equals("BACK")) {
            store(profile.getUserId(), documentSide, contentType, content);
            return new DocumentReview(null, null, null, null, true, false, List.of());
        }

        DocumentOcrService.CedulaData data = ocr.read(content);
        if (!data.idNumber().equals(profile.getIdNumber())) {
            throw new IllegalArgumentException(
                    "La cédula de la imagen no coincide con la registrada en tu cuenta.");
        }

        faces.assertUsableFace(content);
        store(profile.getUserId(), documentSide, contentType, content);

        boolean enrolled = false;
        if (biometricConsent) {
            FaceService.Enrollment enrollment = faces.enroll(content, profile.getUserId());
            biometrics.findByUserId(profile.getUserId()).ifPresentOrElse(existing -> {
                faces.forget(existing.getCollectionId(), existing.getFaceId());
                existing.replaceFace(enrollment.collectionId(), enrollment.faceId(), Instant.now(),
                        CONSENT_VERSION);
            }, () -> biometrics.save(new CustomerBiometric(profile.getUserId(), enrollment.collectionId(),
                    enrollment.faceId(), ALGORITHM, Instant.now(), CONSENT_VERSION)));
            enrolled = true;
        }

        return new DocumentReview(data.idNumber(), data.firstNames(), data.lastNames(), data.birthDate(),
                true, enrolled, differences(profile, data));
    }

    /** Enrola el rostro con el documento ya subido, para no pedir la foto de nuevo. */
    @Transactional
    public ProfileView enrollFace(String username, boolean biometricConsent) {
        if (!biometricConsent) {
            throw new IllegalArgumentException("Necesitamos tu autorización para registrar tu rostro");
        }
        CustomerProfile profile = profileOf(username);
        IdentityDocument front = documents.findByUserIdAndDocumentSide(profile.getUserId(), "FRONT")
                .orElseThrow(() -> new NoSuchElementException("Primero sube el anverso de tu cédula"));

        faces.assertUsableFace(front.getContent());
        FaceService.Enrollment enrollment = faces.enroll(front.getContent(), profile.getUserId());
        biometrics.findByUserId(profile.getUserId()).ifPresentOrElse(existing -> {
            faces.forget(existing.getCollectionId(), existing.getFaceId());
            existing.replaceFace(enrollment.collectionId(), enrollment.faceId(), Instant.now(), CONSENT_VERSION);
        }, () -> biometrics.save(new CustomerBiometric(profile.getUserId(), enrollment.collectionId(),
                enrollment.faceId(), ALGORITHM, Instant.now(), CONSENT_VERSION)));
        return profile(username);
    }

    /** Relee la imagen guardada en vez de confiar en lo que devuelva el navegador. */
    @Transactional
    public ProfileView confirmDocument(String username) {
        CustomerProfile profile = profileOf(username);
        IdentityDocument front = documents.findByUserIdAndDocumentSide(profile.getUserId(), "FRONT")
                .orElseThrow(() -> new NoSuchElementException("Primero sube el anverso de tu cédula"));

        DocumentOcrService.CedulaData data = ocr.read(front.getContent());
        if (!data.idNumber().equals(profile.getIdNumber())) {
            front.markStatus("REJECTED");
            throw new IllegalArgumentException("La cédula de la imagen no coincide con la registrada.");
        }
        if (data.firstNames() != null) profile.setFirstNames(data.firstNames());
        if (data.lastNames() != null) profile.setLastNames(data.lastNames());
        if (data.birthDate() != null) profile.setBirthDate(data.birthDate());
        front.markStatus("ACCEPTED");
        return profile(username);
    }

    public Optional<StoredImage> documentImage(String username, String side) {
        CustomerProfile profile = profileOf(username);
        return documents.findByUserIdAndDocumentSide(profile.getUserId(), normalizeSide(side))
                .map(document -> new StoredImage(document.getContent(), document.getContentType()));
    }

    private void store(long userId, String side, String contentType, byte[] content) {
        documents.findByUserIdAndDocumentSide(userId, side).ifPresentOrElse(existing -> {
            existing.replaceContent(contentType, content);
            existing.markStatus("PENDING");
        }, () -> documents.save(new IdentityDocument(userId, side, contentType, content)));
    }

    private List<String> differences(CustomerProfile profile, DocumentOcrService.CedulaData data) {
        return java.util.stream.Stream.of(
                        differs("nombres", profile.getFirstNames(), data.firstNames()),
                        differs("apellidos", profile.getLastNames(), data.lastNames()),
                        data.birthDate() != null && !data.birthDate().equals(profile.getBirthDate())
                                ? "fecha de nacimiento" : null)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private String differs(String label, String stored, String scanned) {
        if (scanned == null || stored == null) return null;
        return stored.trim().equalsIgnoreCase(scanned.trim()) ? null : label;
    }

    private CustomerProfile profileOf(String username) {
        long userId = identity.accountByUsername(username).id();
        return profiles.findByUserId(userId)
                .orElseThrow(() -> new NoSuchElementException("Esta cuenta no tiene perfil de cliente"));
    }

    private String normalizeSide(String side) {
        String value = side == null ? "" : side.trim().toUpperCase(Locale.ROOT);
        if (!SIDES.contains(value)) throw new IllegalArgumentException("El lado del documento no es válido");
        return value;
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

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        String value = phone.replaceAll("\\s+", "");
        if (!value.matches("\\+?\\d{7,15}")) throw new IllegalArgumentException("El teléfono no es válido");
        return value;
    }
}
