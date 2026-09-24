package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto;
import com.edu.uta.backend.dto.ConfigurarCreditoResponseDto;
import com.edu.uta.backend.service.CreditoConfiguracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/admin/creditos/configurar", "/api/admin/creditos"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('credit.products.manage', 'credit_advisor', 'ROLE_ASESOR', 'ROLE_ADMINISTRATOR', 'administrator')")
public class CreditoConfiguracionController {

    private final CreditoConfiguracionService service;

    /**
     * Permite al asesor crear o parametrizar un producto de crédito según la normativa BCE.
     * Protegido por Spring Security para ROLE_ASESOR o ROLE_ADMIN.
     */
    @PostMapping
    public ResponseEntity<ConfigurarCreditoResponseDto> configurar(
            @Valid @RequestBody ConfigurarCreditoRequestDto dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.configurar(dto));
    }

    /**
     * Permite al asesor/administrador actualizar un producto de crédito existente según normativa BCE.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ConfigurarCreditoResponseDto> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ConfigurarCreditoRequestDto dto
    ) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    /**
     * Lista todos los créditos configurados en el banco o cooperativa.
     */
    @GetMapping
    public ResponseEntity<List<ConfigurarCreditoResponseDto>> listar() {
        return ResponseEntity.ok(service.listarConfigurados());
    }

    /**
     * Actualiza el estado activo/inactivo del producto de crédito.
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<ConfigurarCreditoResponseDto> cambiarEstado(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, Boolean> body
    ) {
        Boolean active = (body != null)
                ? (body.containsKey("active") ? body.get("active") : body.get("activo"))
                : null;
        return ResponseEntity.ok(service.cambiarEstado(id, active));
    }
}
