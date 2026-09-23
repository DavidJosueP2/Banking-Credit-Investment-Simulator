package com.edu.uta.backend.registration;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

import com.edu.uta.backend.identity.IdentityService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private static final Duration CODE_LIFETIME = Duration.ofMinutes(15);
    private static final Duration RESEND_COOLDOWN = Duration.ofMinutes(1);
    private static final int MAX_ATTEMPTS = 5;
    private static final int MINIMUM_PASSWORD_LENGTH = 12;

    private final CustomerProfileRepository profiles;
    private final EmailVerificationRepository verifications;
    private final IdentityService identity;
    private final PasswordEncoder passwords;
    private final VerificationMailer mailer;
    private final IdentityRecordService records;
    private final SecureRandom random = new SecureRandom();

    public RegistrationService(CustomerProfileRepository profiles, EmailVerificationRepository verifications,
                               IdentityService identity, PasswordEncoder passwords, VerificationMailer mailer,
                               IdentityRecordService records) {
        this.profiles = profiles;
        this.verifications = verifications;
        this.identity = identity;
        this.passwords = passwords;
        this.mailer = mailer;
        this.records = records;
    }

    /** Nombres y fecha solo se usan si el documento no los trajo legibles. */
    public record Registration(String firstNames, String lastNames, LocalDate birthDate, String phone,
                               String username, String email, String password) {}

    public record PendingVerification(String email, Instant expiresAt) {}

    @Transactional
    public PendingVerification register(Registration request, IdentityCheckService.Evidence evidence) {
        IdentityCheckService.VerifiedIdentity document = evidence.identity();
        String email = normalizeEmail(request.email());
        String firstNames = IdentityRecordService.properName(document.firstNames() != null ? document.firstNames()
                : required(request.firstNames(), "Ingresa tus nombres"));
        String lastNames = IdentityRecordService.properName(document.lastNames() != null ? document.lastNames()
                : required(request.lastNames(), "Ingresa tus apellidos"));
        LocalDate birthDate = document.birthDate() != null ? document.birthDate() : request.birthDate();
        validateBirthDate(birthDate);
        if (request.password() == null || request.password().length() < MINIMUM_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 12 caracteres");
        }
        if (identity.exists(email)) throw new IllegalArgumentException("El correo ya está registrado");
        if (identity.usernameTaken(request.username())) {
            throw new IllegalArgumentException("El usuario ya está registrado");
        }
        if (profiles.existsByIdTypeAndIdNumber(document.idType(), document.idNumber())) {
            throw new IllegalArgumentException("El documento ya está registrado");
        }

        var account = identity.createAccount(request.username(), email, firstNames + " " + lastNames,
                request.password(), List.of("client"));
        long userId = account.id();
        profiles.save(new CustomerProfile(userId, document.idType(), document.idNumber(), firstNames, lastNames,
                birthDate, normalizePhone(request.phone())));
        records.store(userId, evidence, "REGISTRATION");

        return beginEmailVerification(userId, email);
    }

    private String required(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }

    @Transactional
    public PendingVerification resend(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        long userId = identity.accountByEmail(email).id();
        return beginEmailVerification(userId, email);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
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
            verifications.save(challenge);
            throw new IllegalArgumentException("El código no es válido");
        }
        challenge.markVerified();
        profiles.findByUserId(userId).ifPresent(profile -> profile.setEmailVerified(true));
    }

    public boolean emailVerified(long userId) {
        return verifications.existsByUserIdAndVerifiedAtIsNotNull(userId);
    }

    @Transactional
    public PendingVerification beginEmailVerification(long userId, String email) {
        if (emailVerified(userId)) {
            throw new IllegalArgumentException("El correo ya está verificado");
        }
        verifications.findFirstByUserIdOrderByIdDesc(userId).ifPresent(challenge -> {
            if (challenge.getCreatedAt() != null
                    && challenge.getCreatedAt().isAfter(Instant.now().minus(RESEND_COOLDOWN))) {
                throw new IllegalArgumentException("Espera un minuto antes de solicitar otro código");
            }
        });
        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(CODE_LIFETIME);
        verifications.save(new EmailVerification(userId, email, passwords.encode(code), expiresAt));
        mailer.sendVerificationCode(email, code, expiresAt);
        return new PendingVerification(email, expiresAt);
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
