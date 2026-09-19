package com.edu.uta.backend.registration;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

import com.edu.uta.backend.identity.EcuadorianId;
import com.edu.uta.backend.identity.IdentityService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private static final Duration CODE_LIFETIME = Duration.ofMinutes(15);
    private static final int MAX_ATTEMPTS = 5;
    private static final int MINIMUM_PASSWORD_LENGTH = 12;

    private final CustomerProfileRepository profiles;
    private final EmailVerificationRepository verifications;
    private final IdentityService identity;
    private final PasswordEncoder passwords;
    private final VerificationMailer mailer;
    private final SecureRandom random = new SecureRandom();

    public RegistrationService(CustomerProfileRepository profiles, EmailVerificationRepository verifications,
                               IdentityService identity, PasswordEncoder passwords, VerificationMailer mailer) {
        this.profiles = profiles;
        this.verifications = verifications;
        this.identity = identity;
        this.passwords = passwords;
        this.mailer = mailer;
    }

    public record Registration(String idType, String idNumber, String firstNames, String lastNames,
                               LocalDate birthDate, String phone, String username, String email,
                               String password) {}

    public record PendingVerification(String email, Instant expiresAt) {}

    @Transactional
    public PendingVerification register(Registration request) {
        String idType = normalizeIdType(request.idType());
        String idNumber = request.idNumber() == null ? "" : request.idNumber().trim().toUpperCase(Locale.ROOT);
        String email = normalizeEmail(request.email());
        validateDocument(idType, idNumber);
        validateBirthDate(request.birthDate());
        if (request.password() == null || request.password().length() < MINIMUM_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 12 caracteres");
        }
        if (identity.exists(email)) throw new IllegalArgumentException("El correo ya está registrado");
        if (identity.usernameTaken(request.username())) {
            throw new IllegalArgumentException("El usuario ya está registrado");
        }
        if (profiles.existsByIdTypeAndIdNumber(idType, idNumber)) {
            throw new IllegalArgumentException("El documento ya está registrado");
        }

        String firstNames = request.firstNames().trim();
        String lastNames = request.lastNames().trim();
        var account = identity.createAccount(request.username(), email, firstNames + " " + lastNames,
                request.password(), List.of("client"));
        profiles.save(new CustomerProfile(account.id(), idType, idNumber, firstNames, lastNames,
                request.birthDate(), normalizePhone(request.phone())));

        return issueChallenge(account.id(), email);
    }

    @Transactional
    public PendingVerification resend(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        return issueChallenge(identity.accountByEmail(email).id(), email);
    }

    @Transactional
    public void verifyEmail(String rawEmail, String code) {
        String email = normalizeEmail(rawEmail);
        long userId = identity.accountByEmail(email).id();
        EmailVerification challenge = verifications.findFirstByUserIdOrderByIdDesc(userId)
                .orElseThrow(() -> new NoSuchElementException("No hay un código pendiente"));
        if (challenge.getVerifiedAt() != null) return;
        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("El código expiró, solicita uno nuevo");
        }
        if (challenge.getAttempts() >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException("Superaste los intentos permitidos, solicita un código nuevo");
        }
        if (!passwords.matches(code == null ? "" : code.trim(), challenge.getCodeHash())) {
            challenge.registerFailedAttempt();
            throw new IllegalArgumentException("El código no es válido");
        }
        challenge.markVerified();
        profiles.findByUserId(userId).ifPresent(profile -> profile.setEmailVerified(true));
    }

    public boolean emailVerified(long userId) {
        return verifications.existsByUserIdAndVerifiedAtIsNotNull(userId);
    }

    private PendingVerification issueChallenge(long userId, String email) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(CODE_LIFETIME);
        verifications.save(new EmailVerification(userId, email, passwords.encode(code), expiresAt));
        mailer.sendVerificationCode(email, code, CODE_LIFETIME);
        return new PendingVerification(email, expiresAt);
    }

    private String normalizeIdType(String idType) {
        String value = idType == null ? "" : idType.trim().toUpperCase(Locale.ROOT);
        if (!value.equals("CEDULA") && !value.equals("PASAPORTE")) {
            throw new IllegalArgumentException("El tipo de documento no es válido");
        }
        return value;
    }

    private void validateDocument(String idType, String idNumber) {
        if (idType.equals("CEDULA")) {
            if (!idNumber.matches("\\d{10}")) {
                throw new IllegalArgumentException("La cédula debe tener 10 dígitos");
            }
            if (!EcuadorianId.valid(idNumber)) {
                throw new IllegalArgumentException("La cédula no es válida");
            }
            return;
        }
        if (!idNumber.matches("[A-Z0-9]{6,20}")) {
            throw new IllegalArgumentException("El pasaporte no es válido");
        }
    }


    private void validateBirthDate(LocalDate birthDate) {
        if (birthDate == null) throw new IllegalArgumentException("Ingresa tu fecha de nacimiento");
        LocalDate today = LocalDate.now();
        if (birthDate.isAfter(today.minusYears(18))) {
            throw new IllegalArgumentException("Debes ser mayor de edad para abrir una cuenta");
        }
        if (birthDate.isBefore(today.minusYears(120))) {
            throw new IllegalArgumentException("La fecha de nacimiento no es válida");
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        String value = phone.replaceAll("\\s+", "");
        if (!value.matches("\\+?\\d{7,15}")) throw new IllegalArgumentException("El teléfono no es válido");
        return value;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Ingresa tu correo");
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
