package com.edu.uta.backend.controller;

import com.edu.uta.backend.dto.InstitutionRequestDto;
import com.edu.uta.backend.dto.InstitutionResponseDto;
import com.edu.uta.backend.service.InstitutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/institucion")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionService service;

    /** Endpoint público — frontend lo usa para mostrar nombre/logo dinámico */
    @GetMapping
    public ResponseEntity<InstitutionResponseDto> get() {
        return service.getActiveInstitution()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /** Solo ADMIN — crea o actualiza la configuración institucional */
    @PutMapping
    public ResponseEntity<InstitutionResponseDto> upsert(@Valid @RequestBody InstitutionRequestDto dto) {
        return ResponseEntity.ok(service.upsert(dto));
    }

    /** Solo ADMIN — actualiza solo la URL del logo */
    @PatchMapping("/logo")
    public ResponseEntity<InstitutionResponseDto> updateLogo(@RequestParam String logoUrl) {
        return ResponseEntity.ok(service.updateLogo(logoUrl));
    }
}
