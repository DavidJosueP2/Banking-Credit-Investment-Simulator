package com.edu.uta.backend.verification;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;

import com.edu.uta.backend.registration.IdentityCheckService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import software.amazon.awssdk.core.exception.SdkException;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private static final Logger log = LoggerFactory.getLogger(ProfileController.class);

    private final ProfileService profiles;
    private final IdentityCheckService identityCheck;

    public ProfileController(ProfileService profiles, IdentityCheckService identityCheck) {
        this.profiles = profiles;
        this.identityCheck = identityCheck;
    }

    public record CompleteLiveness(@NotBlank(message = "Falta la sesión de verificación") String sessionId) {}

    public record ContactUpdate(@Size(max = 20, message = "El teléfono es demasiado largo") String phone,
                                @Size(max = 200, message = "La dirección es demasiado larga") String address) {}

    @GetMapping
    public ProfileService.ProfileView profile(Authentication authentication) {
        return profiles.profile(authentication.getName());
    }

    @PutMapping
    public ProfileService.ProfileView updateContact(@Valid @RequestBody ContactUpdate request,
                                                    Authentication authentication) {
        return profiles.updateContact(authentication.getName(), request.phone(), request.address());
    }

    /** Actualizar el documento repite el proceso del registro, esta vez atado a la cuenta del titular. */
    @PostMapping(path = "/identity/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> identityDocument(
            @RequestParam String idType, @RequestParam String idNumber,
            @RequestParam(required = false) String fingerprintCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam String side, @RequestParam MultipartFile file,
            Authentication authentication, HttpSession session) throws IOException {
        identityCheck.analyze(session, profiles.ownerId(authentication.getName()),
                new IdentityCheckService.Claim(idType, idNumber, fingerprintCode, expiryDate),
                side, file.getContentType(), file.getBytes());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/identity/liveness")
    public IdentityCheckService.LivenessTicket identityLiveness(@RequestBody IdentityCheckService.Claim claim,
                                                                Authentication authentication, HttpSession session) {
        return identityCheck.startLiveness(session, profiles.ownerId(authentication.getName()), claim);
    }

    @PostMapping("/identity/complete")
    public IdentityCheckService.Outcome identityComplete(@Valid @RequestBody CompleteLiveness body,
                                                         Authentication authentication, HttpSession session) {
        long owner = profiles.ownerId(authentication.getName());
        IdentityCheckService.Outcome outcome = identityCheck.complete(session, owner, body.sessionId());
        if ("APPROVED".equals(outcome.result())) {
            profiles.updateIdentity(authentication.getName(), identityCheck.evidence(session, owner));
            identityCheck.finish(session);
        }
        return outcome;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> exhausted(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> conflict(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "Este documento pertenece a otra cuenta."));
    }

    @ExceptionHandler(SdkException.class)
    public ResponseEntity<Map<String, String>> unavailable(SdkException exception) {
        log.error("Falló una llamada a AWS al actualizar el documento de un cliente", exception);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message",
                "El servicio de verificación no respondió. Inténtalo en unos minutos."));
    }
}
