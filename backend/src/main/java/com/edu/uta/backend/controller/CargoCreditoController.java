package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.CargoCreditoRequestDto;
import com.edu.uta.backend.dto.CargoCreditoResponseDto;
import com.edu.uta.backend.service.CargoCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/cargos")
@RequiredArgsConstructor
public class CargoCreditoController {

    private final CargoCreditoService service;

    @GetMapping
    public List<CargoCreditoResponseDto> findAll(@RequestParam(required = false) Long productoId) {
        return productoId != null ? service.findByProducto(productoId) : service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CargoCreditoResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<CargoCreditoResponseDto> create(@Valid @RequestBody CargoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CargoCreditoResponseDto> update(@PathVariable Long id,
                                                           @Valid @RequestBody CargoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
