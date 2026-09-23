package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.ProductoCreditoRequestDto;
import com.edu.uta.backend.dto.ProductoCreditoResponseDto;
import com.edu.uta.backend.service.ProductoCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/productos")
@RequiredArgsConstructor
public class ProductoCreditoController {

    private final ProductoCreditoService service;

    @GetMapping
    public List<ProductoCreditoResponseDto> findAll(@RequestParam(required = false) Long tipoId) {
        return tipoId != null ? service.findByTipo(tipoId) : service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoCreditoResponseDto> findById(
            @PathVariable Long id,
            @RequestParam(required = false) String entidad
    ) {
        return ResponseEntity.ok(service.findById(id, entidad));
    }

    @PostMapping
    public ResponseEntity<ProductoCreditoResponseDto> create(@Valid @RequestBody ProductoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoCreditoResponseDto> update(@PathVariable Long id,
                                                              @Valid @RequestBody ProductoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
