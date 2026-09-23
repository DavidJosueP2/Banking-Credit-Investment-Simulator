package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.SegmentoCreditoRequestDto;
import com.edu.uta.backend.dto.SegmentoCreditoResponseDto;
import com.edu.uta.backend.service.SegmentoCreditoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/creditos/segmentos")
@RequiredArgsConstructor
public class SegmentoCreditoController {

    private final SegmentoCreditoService service;

    @GetMapping
    public List<SegmentoCreditoResponseDto> findAll(@RequestParam(defaultValue = "false") boolean todos) {
        return todos ? service.findAll() : service.findAllActivos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SegmentoCreditoResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<SegmentoCreditoResponseDto> create(@Valid @RequestBody SegmentoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SegmentoCreditoResponseDto> update(@PathVariable Long id,
                                                              @Valid @RequestBody SegmentoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable Long id) {
        service.toggleActivo(id);
        return ResponseEntity.noContent().build();
    }
}
