package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.SimulacionRequestDto;
import com.edu.uta.backend.dto.SimulacionResponseDto;
import com.edu.uta.backend.service.SimuladorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/creditos/simular", "/api/simulador"})
@RequiredArgsConstructor
public class SimuladorController {

    private final SimuladorService service;

    /**
     * Endpoint público — cualquier usuario puede simular.
     * El sistema (FRANCES / ALEMAN) se incluye en el body.
     */
    @PostMapping
    public SimulacionResponseDto simular(@Valid @RequestBody SimulacionRequestDto req) {
        return service.simular(req);
    }
}
