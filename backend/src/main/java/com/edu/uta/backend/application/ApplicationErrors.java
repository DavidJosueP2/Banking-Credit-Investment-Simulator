package com.edu.uta.backend.application;

import java.util.Map;
import java.util.NoSuchElementException;

import com.edu.uta.backend.config.NormativaFinancieraException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import software.amazon.awssdk.core.exception.SdkException;

/** Respuestas de error comunes a los controladores de solicitudes, con mensajes listos para mostrar. */
abstract class ApplicationErrors {

    private static final Logger log = LoggerFactory.getLogger(ApplicationErrors.class);

    protected ResponseEntity<byte[]> file(ApplicationService.Document document) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(document.fileName()).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(document.contentType()))
                .body(document.content());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NormativaFinancieraException.class)
    public ResponseEntity<Map<String, String>> regulation(NormativaFinancieraException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> conflict(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> denied(AccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(SdkException.class)
    public ResponseEntity<Map<String, String>> unavailable(SdkException exception) {
        log.error("Falló una llamada a AWS durante una solicitud", exception);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message",
                "El servicio de verificación no respondió. Inténtalo en unos minutos."));
    }
}
