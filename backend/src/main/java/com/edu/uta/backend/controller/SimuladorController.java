package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.EntidadCreditoDto;
import com.edu.uta.backend.dto.ProductoSimuladorDto;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.dto.SimulacionRequestDto;
import com.edu.uta.backend.dto.SimulacionResponseDto;
import com.edu.uta.backend.service.NormativaRegulatoriaService;
import com.edu.uta.backend.service.NormativaRegulatoriaService.ReglaNormativaDto;
import com.edu.uta.backend.service.SimuladorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/simulador", "/api/creditos/simular", "/api/public/creditos"})
@RequiredArgsConstructor
public class SimuladorController {

    private final SimuladorService service;
    private final NormativaRegulatoriaService normativaService;
    private final com.edu.uta.backend.service.CapacidadPagoService capacidadPago;

    /**
     * Catálogo dinámico de Tipos de Crédito configurados para el usuario final.
     * GET /api/simulador/productos o GET /api/public/creditos/activos
     */
    @GetMapping({"/productos", "/activos"})
    public ResponseEntity<List<ProductoSimuladorDto>> obtenerProductos() {
        return ResponseEntity.ok(service.obtenerProductosDisponibles());
    }

    /**
     * Consulta de límites normativos vigentes (BCE, JPRFM, SB, SEPS)
     * GET /api/simulador/normativa o GET /api/creditos/normativa/vigente
     */
    @GetMapping({"/normativa", "/normativa/vigente"})
    public ResponseEntity<List<ReglaNormativaDto>> obtenerNormativaVigente(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha
    ) {
        return ResponseEntity.ok(normativaService.listarReglasVigentes(fecha));
    }

    /**
     * Catálogo legado para retrocompatibilidad
     * GET /api/simulador/entidades
     */
    @GetMapping("/entidades")
    public ResponseEntity<List<EntidadCreditoDto>> obtenerEntidades() {
        return ResponseEntity.ok(service.obtenerEntidadesDisponibles());
    }

    /**
     * Simulación de crédito para el Usuario Final / Cliente.
     * POST /api/simulador/calcular
     */
    @PostMapping("/calcular")
    public ResponseEntity<SimulacionClienteResponseDto> calcularCliente(
            @Valid @RequestBody SimulacionClienteRequestDto req
    ) {
        return ResponseEntity.ok(service.simularCliente(req));
    }

    /**
     * ¿Cuánto me prestan? Mayor monto cuya cuota más alta no supera lo que la persona puede pagar.
     * POST /api/simulador/capacidad
     */
    @PostMapping("/capacidad")
    public ResponseEntity<com.edu.uta.backend.service.CapacidadPagoService.Resultado> capacidad(
            @RequestBody com.edu.uta.backend.service.CapacidadPagoService.Solicitud solicitud
    ) {
        return ResponseEntity.ok(capacidadPago.calcular(solicitud));
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
