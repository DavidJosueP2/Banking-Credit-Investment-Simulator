package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.dto.SimulacionRequestDto;
import com.edu.uta.backend.dto.SimulacionResponseDto;
import com.edu.uta.backend.dto.EntidadCreditoDto;
import com.edu.uta.backend.service.SimuladorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/simulador", "/api/creditos/simular"})
@RequiredArgsConstructor
public class SimuladorController {

    private final SimuladorService service;
    
    /**
     * Catálogo de entidades financieras disponibles (Bancos y Cooperativas)
     * con sus tasas oficiales y seguros de desgravamen configurados en base de datos.
     * GET /api/simulador/entidades
     */
    @GetMapping("/entidades")
    public ResponseEntity<List<com.edu.uta.backend.dto.EntidadCreditoDto>> obtenerEntidades() {
        return ResponseEntity.ok(service.obtenerEntidadesDisponibles());
    }

    /**
     * Endpoint simplificado para el Usuario Normal / Cliente.
     * POST /api/simulador/calcular
     * Realiza matching con productos configurados, aplica desgravamen mensual sobre saldo deudor
     * y genera la tabla de amortización con 7 columnas exactas.
     */
    @PostMapping("/calcular")
    public ResponseEntity<SimulacionClienteResponseDto> calcularCliente(
            @Valid @RequestBody SimulacionClienteRequestDto req
    ) {
        return ResponseEntity.ok(service.simularCliente(req));
    }

    /**
     * Endpoint avanzado / legacy para simulación directa de parámetros.
     * POST /api/simulador o POST /api/creditos/simular
     */
    @PostMapping
    public SimulacionResponseDto simular(@Valid @RequestBody SimulacionRequestDto req) {
        return service.simular(req);
    }
}
