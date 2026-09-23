package com.edu.uta.backend.registration;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import software.amazon.awssdk.core.exception.SdkException;

@RestController
@RequestMapping("/api/public/registration/identity")
public class IdentityCheckController {

    private static final Logger log = LoggerFactory.getLogger(IdentityCheckController.class);

    private final IdentityCheckService identityCheck;

    public IdentityCheckController(IdentityCheckService identityCheck) {
        this.identityCheck = identityCheck;
    }

    public record CompleteLiveness(@NotBlank(message = "Falta la sesión de verificación") String sessionId) {}

    @PostMapping(path = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> document(
            @RequestParam String idType, @RequestParam String idNumber,
            @RequestParam(required = false) String fingerprintCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
            @RequestParam String side, @RequestParam MultipartFile file, HttpSession session) throws IOException {
        identityCheck.analyze(session, null,
                new IdentityCheckService.Claim(idType, idNumber, fingerprintCode, expiryDate),
                side, file.getContentType(), file.getBytes());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/liveness")
    public IdentityCheckService.LivenessTicket liveness(@RequestBody IdentityCheckService.Claim claim,
                                                        HttpSession session) {
        return identityCheck.startLiveness(session, null, claim);
    }

    @PostMapping("/complete")
    public IdentityCheckService.Outcome complete(@Valid @RequestBody CompleteLiveness body, HttpSession session) {
        return identityCheck.complete(session, null, body.sessionId());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> exhausted(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(SdkException.class)
    public ResponseEntity<Map<String, String>> unavailable(SdkException exception) {
        // GetFederationToken exige que el usuario IAM tenga el permiso sts:GetFederationToken.
        log.error("Falló una llamada a AWS durante la verificación de identidad", exception);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message",
                "El servicio de verificación no respondió. Inténtalo en unos minutos."));
    }
}
