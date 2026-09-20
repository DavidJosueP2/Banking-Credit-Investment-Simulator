package com.edu.uta.backend.verification;

import java.io.IOException;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profiles;

    public ProfileController(ProfileService profiles) {
        this.profiles = profiles;
    }

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

    @PostMapping(path = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileService.DocumentReview upload(@RequestParam String side,
                                                @RequestParam MultipartFile file,
                                                @RequestParam(defaultValue = "false") boolean biometricConsent,
                                                Authentication authentication) throws IOException {
        return profiles.uploadDocument(authentication.getName(), side, file.getContentType(),
                file.getBytes(), biometricConsent);
    }

    @PostMapping("/biometrics")
    public ProfileService.ProfileView enrollFace(@RequestParam(defaultValue = "false") boolean biometricConsent,
                                                 Authentication authentication) {
        return profiles.enrollFace(authentication.getName(), biometricConsent);
    }

    @PostMapping("/documents/confirm")
    public ProfileService.ProfileView confirm(Authentication authentication) {
        return profiles.confirmDocument(authentication.getName());
    }

    @GetMapping("/documents/{side}")
    public ResponseEntity<byte[]> image(@PathVariable String side, Authentication authentication) {
        return profiles.documentImage(authentication.getName(), side)
                .map(image -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(image.contentType()))
                        .cacheControl(CacheControl.noStore())
                        .body(image.content()))
                .orElse(ResponseEntity.notFound().build());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }
}
