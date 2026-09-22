package com.edu.uta.backend.dto;

import java.math.BigDecimal;

public record EntidadCreditoDto(
        Long id,
        String nombre,
        String tipo,
        BigDecimal tasaNominal,
        BigDecimal desgravamen,
        BigDecimal montoMin,
        BigDecimal montoMax,
        Integer plazoMinMeses,
        Integer plazoMaxMeses,
        String sistemasPermitidos
) {}
