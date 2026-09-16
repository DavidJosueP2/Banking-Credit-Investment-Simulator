package com.edu.uta.backend.investment;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.edu.uta.backend.identity.IdentityService;

@RestController
@RequestMapping("/api")
public class InvestmentController {

    private final InvestmentService investments;
    private final InvestmentPdfService pdf;
    private final IdentityService identity;

    public InvestmentController(InvestmentService investments, InvestmentPdfService pdf, IdentityService identity) {
        this.investments = investments;
        this.pdf = pdf;
        this.identity = identity;
    }

    public record StatusInput(boolean active) {}

    @GetMapping("/public/investments/products")
    public List<InvestmentService.Product> publicProducts() {
        return investments.publicProducts();
    }

    @PostMapping("/public/investments/simulations")
    public InvestmentService.SimulationResult simulate(@RequestBody InvestmentService.SimulationRequest request) {
        return investments.simulate(request);
    }

    @PostMapping(value = "/public/investments/simulations/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@RequestBody InvestmentService.SimulationRequest request) {
        InvestmentService.SimulationResult result = investments.simulate(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("simulacion-" + result.reference() + ".pdf").build().toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf.create(result));
    }

    @GetMapping("/admin/investments/products")
    @PreAuthorize("hasAuthority('investment.products.manage')")
    public List<InvestmentService.Product> adminProducts() {
        return investments.adminProducts();
    }

    @PostMapping("/admin/investments/products")
    @PreAuthorize("hasAuthority('investment.products.manage')")
    public ResponseEntity<InvestmentService.Product> create(@RequestBody InvestmentService.ProductInput request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(investments.create(request, currentUser(authentication)));
    }

    @PutMapping("/admin/investments/products/{id}")
    @PreAuthorize("hasAuthority('investment.products.manage')")
    public InvestmentService.Product update(@PathVariable long id,
            @RequestBody InvestmentService.ProductInput request, Authentication authentication) {
        return investments.update(id, request, currentUser(authentication));
    }

    @PatchMapping("/admin/investments/products/{id}/status")
    @PreAuthorize("hasAuthority('investment.products.manage')")
    public InvestmentService.Product status(@PathVariable long id, @RequestBody StatusInput request,
            Authentication authentication) {
        return investments.changeStatus(id, request.active(), currentUser(authentication));
    }

    private long currentUser(Authentication authentication) {
        return identity.accountByEmail(authentication.getName()).id();
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
