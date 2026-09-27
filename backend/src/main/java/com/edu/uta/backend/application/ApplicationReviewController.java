package com.edu.uta.backend.application;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Bandeja de revisión: asesores y analistas ven su módulo; la administración consulta sin decidir. */
@RestController
@RequestMapping("/api/admin/applications")
@PreAuthorize("hasAnyAuthority('credit.requests.review', 'credit.requests.approve', 'investment.requests.review', 'requests.audit')")
public class ApplicationReviewController extends ApplicationErrors {

    private final ApplicationService applications;

    public ApplicationReviewController(ApplicationService applications) {
        this.applications = applications;
    }

    public record Decision(String decision, String comment) {}

    @GetMapping
    public List<ApplicationService.Summary> queue(Authentication authentication) {
        return applications.queue(authorities(authentication));
    }

    @GetMapping("/{id}")
    public ApplicationService.ReviewDetail detail(@PathVariable long id, Authentication authentication) {
        return applications.reviewDetail(authentication.getName(), authorities(authentication), id);
    }

    @PostMapping("/{id}/take")
    public ApplicationService.ReviewDetail take(@PathVariable long id, Authentication authentication) {
        return applications.take(authentication.getName(), authorities(authentication), id);
    }

    @PostMapping("/{id}/decision")
    public ApplicationService.ReviewDetail decide(@PathVariable long id, @RequestBody Decision body,
                                                  Authentication authentication) {
        return applications.decide(authentication.getName(), authorities(authentication), id,
                body == null ? null : body.decision(), body == null ? null : body.comment());
    }

    @GetMapping("/{id}/documents/{documentId}")
    public ResponseEntity<byte[]> document(@PathVariable long id, @PathVariable long documentId,
                                           Authentication authentication) {
        return file(applications.reviewDocument(authorities(authentication), id, documentId));
    }

    @GetMapping("/{id}/identity/{side}")
    public ResponseEntity<byte[]> identityDocument(@PathVariable long id, @PathVariable String side,
                                                   Authentication authentication) {
        return file(applications.identityDocument(authorities(authentication), id, side));
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('payments.register')")
    public ApplicationService.ReviewDetail registerPayment(@PathVariable long id,
                                                           @RequestBody ApplicationService.RegisterPayment body,
                                                           Authentication authentication) {
        return applications.registerPayment(authentication.getName(), authorities(authentication), id, body);
    }

    @DeleteMapping("/{id}/payments/{paymentId}")
    @PreAuthorize("hasAuthority('payments.register')")
    public ApplicationService.ReviewDetail deletePayment(@PathVariable long id, @PathVariable long paymentId,
                                                         Authentication authentication) {
        return applications.deletePayment(authentication.getName(), authorities(authentication), id, paymentId);
    }

    private static Set<String> authorities(Authentication authentication) {
        return authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }
}
