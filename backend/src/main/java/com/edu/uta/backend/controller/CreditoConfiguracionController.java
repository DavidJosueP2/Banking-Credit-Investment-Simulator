package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto;
import com.edu.uta.backend.dto.ConfigurarCreditoResponseDto;
import com.edu.uta.backend.service.CreditoConfiguracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/creditos/configurar")
@RequiredArgsConstructor
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
     * Lista todos los créditos configurados en el banco o cooperativa.
     */
    @GetMapping
    public ResponseEntity<List<ConfigurarCreditoResponseDto>> listar() {
        return ResponseEntity.ok(service.listarConfigurados());
    }
}
