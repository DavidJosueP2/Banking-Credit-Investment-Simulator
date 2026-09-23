package com.edu.uta.backend.verification;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import software.amazon.awssdk.services.sts.StsClient;

/**
 * Banco de pruebas del paso biométrico. Solo existe con el perfil dev:
 * en producción el liveness se dispara desde la operación sensible, no desde una pantalla suelta.
 */
@RestController
@RequestMapping("/api/dev/liveness")
@Profile("dev")
public class LivenessDevController {

    private static final int CREDENTIALS_SECONDS = 900;

    private final LivenessService liveness;
    private final StsClient sts;
    private final AwsProperties properties;

    public LivenessDevController(LivenessService liveness, StsClient sts, AwsProperties properties) {
        this.liveness = liveness;
        this.sts = sts;
        this.properties = properties;
    }

    /** Credenciales efímeras para que el componente del navegador hable con Rekognition. */
    @PostMapping("/credentials")
    public Map<String, String> credentials() {
        var temporary = sts.getSessionToken(request -> request.durationSeconds(CREDENTIALS_SECONDS))
                .credentials();
        return Map.of(
                "region", properties.region(),
                "accessKeyId", temporary.accessKeyId(),
                "secretAccessKey", temporary.secretAccessKey(),
                "sessionToken", temporary.sessionToken(),
                "expiration", temporary.expiration().toString());
    }

    @PostMapping("/session")
    public Map<String, String> session(Authentication authentication) {
        return Map.of("sessionId", liveness.startSession(authentication.getName()));
    }

    @GetMapping("/session/{sessionId}")
    public LivenessService.Outcome result(@PathVariable String sessionId, Authentication authentication) {
        return liveness.verify(authentication.getName(), sessionId, "DEV_TEST", null);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }
}
