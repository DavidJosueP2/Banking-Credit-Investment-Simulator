package com.edu.uta.backend.application;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Espacio del cliente: simulaciones guardadas, solicitudes y productos aprobados. */
@RestController
@RequestMapping("/api/client")
public class ClientApplicationController extends ApplicationErrors {

    private final ApplicationService applications;
    private final SavedSimulationService simulations;

    public ClientApplicationController(ApplicationService applications, SavedSimulationService simulations) {
        this.applications = applications;
        this.simulations = simulations;
    }

    public record Comment(String comment) {}

    public record SessionBody(String sessionId) {}

    @GetMapping("/readiness")
    public ApplicationService.Readiness readiness(Authentication authentication) {
        return applications.readiness(authentication.getName());
    }

    @GetMapping("/simulations")
    @PreAuthorize("hasAuthority('simulation.save')")
    public List<SavedSimulationService.SavedSimulation> simulations(Authentication authentication) {
        return simulations.list(authentication.getName());
    }

    @PostMapping("/simulations")
    @PreAuthorize("hasAuthority('simulation.save')")
    public ResponseEntity<SavedSimulationService.SavedSimulation> saveSimulation(
            @RequestBody SavedSimulationService.SaveInput input, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(simulations.save(authentication.getName(), input));
    }

    @DeleteMapping("/simulations/{id}")
    @PreAuthorize("hasAuthority('simulation.save')")
    public ResponseEntity<Void> deleteSimulation(@PathVariable long id, Authentication authentication) {
        simulations.delete(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/applications")
    @PreAuthorize("hasAuthority('own.requests.read')")
    public List<ApplicationService.Summary> applications(Authentication authentication) {
        return applications.customerApplications(authentication.getName());
    }

    @GetMapping("/applications/{id}")
    @PreAuthorize("hasAuthority('own.requests.read')")
    public ApplicationService.Detail application(@PathVariable long id, Authentication authentication) {
        return applications.customerApplication(authentication.getName(), id);
    }

    @PostMapping("/applications")
    @PreAuthorize("hasAnyAuthority('credit.request.create', 'investment.request.create')")
    public ResponseEntity<ApplicationService.Detail> create(@RequestBody ApplicationService.NewApplication input,
                                                            Authentication authentication) {
        String required = "CREDIT".equals(ScenarioCalculator.normalizeType(input.productType()))
                ? "credit.request.create" : "investment.request.create";
        boolean allowed = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).anyMatch(required::equals);
        if (!allowed) throw new AccessDeniedException("Tu cuenta no puede solicitar este producto.");
        return ResponseEntity.status(HttpStatus.CREATED).body(applications.create(authentication.getName(), input));
    }

    @PostMapping("/applications/{id}/biometric/start")
    @PreAuthorize("hasAuthority('identity.verification.start')")
    public ApplicationService.LivenessTicket startBiometric(@PathVariable long id, Authentication authentication) {
        return applications.startBiometric(authentication.getName(), id);
    }

    @PostMapping("/applications/{id}/biometric/complete")
    @PreAuthorize("hasAuthority('identity.verification.start')")
    public ApplicationService.BiometricResult completeBiometric(@PathVariable long id, @RequestBody SessionBody body,
                                                                Authentication authentication) {
        return applications.completeBiometric(authentication.getName(), id, body == null ? null : body.sessionId());
    }

    @PostMapping("/applications/{id}/cancel")
    @PreAuthorize("hasAuthority('own.requests.read')")
    public ApplicationService.Detail cancel(@PathVariable long id, @RequestBody(required = false) Comment body,
                                            Authentication authentication) {
        return applications.cancel(authentication.getName(), id, body == null ? null : body.comment());
    }

    @PostMapping("/applications/{id}/respond")
    @PreAuthorize("hasAuthority('own.requests.read')")
    public ApplicationService.Detail respond(@PathVariable long id, @RequestBody Comment body,
                                             Authentication authentication) {
        return applications.respond(authentication.getName(), id, body == null ? null : body.comment());
    }

    @PostMapping(path = "/applications/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('own.requests.read')")
    public ResponseEntity<ApplicationService.DocumentInfo> upload(@PathVariable long id,
                                                                  @RequestParam MultipartFile file,
                                                                  Authentication authentication) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED).body(applications.upload(authentication.getName(), id,
                file.getOriginalFilename(), file.getContentType(), file.getBytes()));
    }

    @GetMapping("/applications/{id}/documents/{documentId}")
    @PreAuthorize("hasAuthority('own.requests.read')")
    public ResponseEntity<byte[]> download(@PathVariable long id, @PathVariable long documentId,
                                           Authentication authentication) {
        return file(applications.customerDocument(authentication.getName(), id, documentId));
    }

    @DeleteMapping("/applications/{id}/documents/{documentId}")
    @PreAuthorize("hasAuthority('own.requests.read')")
    public ResponseEntity<Void> deleteDocument(@PathVariable long id, @PathVariable long documentId,
                                               Authentication authentication) {
        applications.deleteDocument(authentication.getName(), id, documentId);
        return ResponseEntity.noContent().build();
    }
}
