package com.edu.uta.backend.verification;

import java.time.LocalDate;
import java.util.NoSuchElementException;

import com.edu.uta.backend.identity.IdentityService;
import com.edu.uta.backend.registration.CustomerProfile;
import com.edu.uta.backend.registration.CustomerProfileRepository;
import com.edu.uta.backend.registration.IdentityCheckService;
import com.edu.uta.backend.registration.IdentityRecordService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Perfil del cliente. El contacto se edita libremente; el documento solo cambia repitiendo la
 * verificación completa (documento y prueba de vida contra el rostro ya registrado).
 */
@Service
public class ProfileService {

    private final CustomerProfileRepository profiles;
    private final IdentityService identity;
    private final IdentityRecordService records;

    public ProfileService(CustomerProfileRepository profiles, IdentityService identity,
                          IdentityRecordService records) {
        this.profiles = profiles;
        this.identity = identity;
        this.records = records;
    }

    public record ProfileView(String idType, String idNumber, String firstNames, String lastNames,
                              LocalDate birthDate, String phone, String address, boolean emailVerified) {}

    public ProfileView profile(String username) {
        CustomerProfile profile = profileOf(username);
        return new ProfileView(profile.getIdType(), profile.getIdNumber(), profile.getFirstNames(),
                profile.getLastNames(), profile.getBirthDate(), profile.getPhone(), profile.getAddress(),
                profile.isEmailVerified());
    }

    @Transactional
    public ProfileView updateContact(String username, String phone, String address) {
        CustomerProfile profile = profileOf(username);
        profile.setPhone(normalizePhone(phone));
        profile.setAddress(address == null || address.isBlank() ? null : address.trim());
        return profile(username);
    }

    /**
     * Los datos que el nuevo documento no trajo legibles se conservan. Si la cuenta aún no tiene perfil
     * de cliente (p. ej. una cuenta creada sin pasar por el registro), esta verificación lo crea con lo
     * que leyó el documento: es el mismo control de identidad que en el registro.
     */
    @Transactional
    public ProfileView updateIdentity(String username, IdentityCheckService.Evidence evidence) {
        IdentityCheckService.VerifiedIdentity document = evidence.identity();
        IdentityService.Account account = identity.accountByUsername(username);
        CustomerProfile profile = profiles.findByUserId(account.id()).orElse(null);
        if (profile == null) profile = firstProfile(account, document);
        profile.replaceDocument(document.idType(), document.idNumber());
        if (document.firstNames() != null) profile.setFirstNames(IdentityRecordService.properName(document.firstNames()));
        if (document.lastNames() != null) profile.setLastNames(IdentityRecordService.properName(document.lastNames()));
        if (document.birthDate() != null) profile.setBirthDate(document.birthDate());
        identity.rename(profile.getUserId(), profile.getFirstNames() + " " + profile.getLastNames());
        records.store(profile.getUserId(), evidence, "IDENTITY_UPDATE");
        return profile(username);
    }

    /** Dueño de la verificación: la cuenta, tenga o no perfil todavía. */
    public long ownerId(String username) {
        return identity.accountByUsername(username).id();
    }

    private CustomerProfile firstProfile(IdentityService.Account account, IdentityCheckService.VerifiedIdentity document) {
        LocalDate birthDate = document.birthDate();
        if (birthDate == null) {
            throw new IllegalArgumentException(
                    "No pudimos leer tu fecha de nacimiento en el documento. Usa tu cédula o una foto más nítida.");
        }
        if (birthDate.isAfter(LocalDate.now().minusYears(18))) {
            throw new IllegalArgumentException("Debes ser mayor de edad para tener una cuenta de cliente.");
        }
        String[] names = account.fullName().trim().split("\\s+", 2);
        String firstNames = document.firstNames() != null ? document.firstNames() : names[0];
        String lastNames = document.lastNames() != null ? document.lastNames() : names.length > 1 ? names[1] : names[0];
        CustomerProfile profile = new CustomerProfile(account.id(), document.idType(), document.idNumber(),
                IdentityRecordService.properName(firstNames), IdentityRecordService.properName(lastNames), birthDate, null);
        // La cuenta ya inicia sesión: su correo quedó verificado al crearla (o es una cuenta de ejemplo).
        profile.setEmailVerified(true);
        return profiles.save(profile);
    }

    private CustomerProfile profileOf(String username) {
        long userId = identity.accountByUsername(username).id();
        return profiles.findByUserId(userId)
                .orElseThrow(() -> new NoSuchElementException("Esta cuenta no tiene perfil de cliente"));
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        String value = phone.replaceAll("\\s+", "");
        if (!value.matches("\\+?\\d{7,15}")) throw new IllegalArgumentException("El teléfono no es válido");
        return value;
    }
}
