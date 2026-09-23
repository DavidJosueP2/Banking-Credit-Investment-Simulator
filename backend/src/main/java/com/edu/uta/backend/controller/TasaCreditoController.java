package com.edu.uta.backend.controller;

import com.edu.uta.backend.domain.enums.TipoTasa;
import com.edu.uta.backend.dto.TasaCreditoRequestDto;
import com.edu.uta.backend.dto.TasaCreditoResponseDto;
import com.edu.uta.backend.service.TasaCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/tasas")
@RequiredArgsConstructor
public class TasaCreditoController {

    private final TasaCreditoService service;

    @GetMapping
    public List<TasaCreditoResponseDto> findAll(
            @RequestParam(required = false) Long productoId,
            @RequestParam(required = false) TipoTasa tipoTasa,
            @RequestParam(defaultValue = "false") boolean globales) {
        if (productoId != null) return service.findByProducto(productoId);
        if (tipoTasa   != null) return service.findByTipo(tipoTasa);
        if (globales)           return service.findGlobales();
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TasaCreditoResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<TasaCreditoResponseDto> create(@Valid @RequestBody TasaCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TasaCreditoResponseDto> update(@PathVariable Long id,
                                                          @Valid @RequestBody TasaCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
