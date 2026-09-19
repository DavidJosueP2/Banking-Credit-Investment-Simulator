package com.edu.uta.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TipoCreditoRequestDto(
        @NotNull Long segmentoId,
        @NotBlank @Size(max = 200) String nombre,
        String descripcion,
        @NotNull Integer orden
) {}
