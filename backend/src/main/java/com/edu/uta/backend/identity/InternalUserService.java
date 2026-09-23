package com.edu.uta.backend.identity;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.edu.uta.backend.registration.RegistrationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalUserService {

    private static final Set<String> INTERNAL_ROLES = Set.of(
            "credit_advisor", "investment_advisor", "administrator");
    private static final String UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
    private static final String NUMBERS = "23456789";
    private static final String SYMBOLS = "!@#$%*-_";
    private static final int GENERATED_PASSWORD_LENGTH = 18;

    private final IdentityService identity;
    private final RegistrationService registration;
    private final SecureRandom random = new SecureRandom();

    public InternalUserService(IdentityService identity, RegistrationService registration) {
        this.identity = identity;
        this.registration = registration;
    }

    public record Creation(IdentityService.Account account,
                           RegistrationService.PendingVerification verification,
                           String temporaryPassword) {}

    @Transactional
    public Creation create(String username, String email, String fullName, String password,
                           String passwordMode, List<String> roles) {
        validateInternalRoles(roles);
        String mode = passwordMode == null ? "manual" : passwordMode.trim().toLowerCase(Locale.ROOT);
        if (!mode.equals("manual") && !mode.equals("generated")) {
            throw new IllegalArgumentException("Selecciona cómo se definirá la contraseña inicial");
        }

        String generatedPassword = mode.equals("generated") ? generatePassword() : null;
        String initialPassword = generatedPassword != null ? generatedPassword : password;
        IdentityService.Account account = identity.createAccount(
                username, email, fullName, initialPassword, roles);
        RegistrationService.PendingVerification verification = registration.beginEmailVerification(
                account.id(), account.email());
        return new Creation(identity.accountById(account.id()), verification, generatedPassword);
    }

    @Transactional
    public RegistrationService.PendingVerification resendVerification(long userId) {
        IdentityService.Account account = identity.accountById(userId);
        return registration.beginEmailVerification(account.id(), account.email());
    }

    private void validateInternalRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) throw new IllegalArgumentException("Selecciona un rol interno");
        if (!INTERNAL_ROLES.containsAll(roles)) {
            throw new IllegalArgumentException("Desde esta sección solo se pueden crear cuentas de personal interno");
        }
    }

    private String generatePassword() {
        List<Character> characters = new ArrayList<>(GENERATED_PASSWORD_LENGTH);
        characters.add(randomCharacter(UPPERCASE));
        characters.add(randomCharacter(LOWERCASE));
        characters.add(randomCharacter(NUMBERS));
        characters.add(randomCharacter(SYMBOLS));

        String all = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;
        while (characters.size() < GENERATED_PASSWORD_LENGTH) characters.add(randomCharacter(all));
        for (int index = characters.size() - 1; index > 0; index--) {
            int replacement = random.nextInt(index + 1);
            Character current = characters.get(index);
            characters.set(index, characters.get(replacement));
            characters.set(replacement, current);
        }

        StringBuilder password = new StringBuilder(GENERATED_PASSWORD_LENGTH);
        for (Character character : characters) password.append(character.charValue());
        return password.toString();
    }

    private char randomCharacter(String source) {
        return source.charAt(random.nextInt(source.length()));
    }
}
