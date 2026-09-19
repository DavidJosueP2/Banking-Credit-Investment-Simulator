package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.TipoCreditoRequestDto;
import com.edu.uta.backend.dto.TipoCreditoResponseDto;
import com.edu.uta.backend.service.TipoCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/tipos")
@RequiredArgsConstructor
public class TipoCreditoController {

    private final TipoCreditoService service;

    @GetMapping
    public List<TipoCreditoResponseDto> findAll(@RequestParam(required = false) Long segmentoId) {
        return segmentoId != null ? service.findBySegmento(segmentoId) : service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoCreditoResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<TipoCreditoResponseDto> create(@Valid @RequestBody TipoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoCreditoResponseDto> update(@PathVariable Long id,
                                                          @Valid @RequestBody TipoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
