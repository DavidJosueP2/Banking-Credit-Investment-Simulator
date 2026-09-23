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

    /** Los datos que el nuevo documento no trajo legibles se conservan. */
    @Transactional
    public ProfileView updateIdentity(String username, IdentityCheckService.Evidence evidence) {
        CustomerProfile profile = profileOf(username);
        IdentityCheckService.VerifiedIdentity document = evidence.identity();
        profile.replaceDocument(document.idType(), document.idNumber());
        if (document.firstNames() != null) profile.setFirstNames(IdentityRecordService.properName(document.firstNames()));
        if (document.lastNames() != null) profile.setLastNames(IdentityRecordService.properName(document.lastNames()));
        if (document.birthDate() != null) profile.setBirthDate(document.birthDate());
        identity.rename(profile.getUserId(), profile.getFirstNames() + " " + profile.getLastNames());
        records.store(profile.getUserId(), evidence, "IDENTITY_UPDATE");
        return profile(username);
    }

    public long ownerId(String username) {
        return profileOf(username).getUserId();
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
