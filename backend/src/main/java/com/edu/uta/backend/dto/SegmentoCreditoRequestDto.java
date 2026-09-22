package com.edu.uta.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SegmentoCreditoRequestDto(
        @NotBlank @Size(max = 50) String codigo,
        @NotBlank @Size(max = 200) String nombre,
        String descripcion,
        @NotNull Integer orden
) {}
