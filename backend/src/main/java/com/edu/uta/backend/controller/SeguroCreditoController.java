package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.SeguroCreditoRequestDto;
import com.edu.uta.backend.dto.SeguroCreditoResponseDto;
import com.edu.uta.backend.service.SeguroCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/seguros")
@RequiredArgsConstructor
public class SeguroCreditoController {

    private final SeguroCreditoService service;

    @GetMapping
    public List<SeguroCreditoResponseDto> findAll(@RequestParam(required = false) Long productoId) {
        return productoId != null ? service.findByProducto(productoId) : service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SeguroCreditoResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<SeguroCreditoResponseDto> create(@Valid @RequestBody SeguroCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SeguroCreditoResponseDto> update(@PathVariable Long id,
                                                            @Valid @RequestBody SeguroCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
