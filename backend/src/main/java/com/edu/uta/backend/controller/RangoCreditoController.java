package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.RangoCreditoRequestDto;
import com.edu.uta.backend.dto.RangoCreditoResponseDto;
import com.edu.uta.backend.service.RangoCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/rangos")
@RequiredArgsConstructor
public class RangoCreditoController {

    private final RangoCreditoService service;

    @GetMapping
    public List<RangoCreditoResponseDto> findAll(@RequestParam(required = false) Long productoId) {
        return productoId != null ? service.findByProducto(productoId) : service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RangoCreditoResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<RangoCreditoResponseDto> create(@Valid @RequestBody RangoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RangoCreditoResponseDto> update(@PathVariable Long id,
                                                           @Valid @RequestBody RangoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
