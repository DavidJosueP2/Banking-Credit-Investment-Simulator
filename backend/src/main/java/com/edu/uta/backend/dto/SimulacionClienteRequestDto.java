package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SimulacionClienteRequestDto(
        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "50.00", message = "El monto debe ser mínimo $50")
        BigDecimal monto,

        String frecuencia, // MENSUAL o ANUAL (por defecto MENSUAL)

        @NotNull(message = "El plazo es obligatorio")
        Integer plazo,     // en meses o años según la unidad

        @NotNull(message = "El sistema de amortización es obligatorio (FRANCES o ALEMAN)")
        SistemaAmortizacion sistema,

        String entidad,    // Opcional para retrocompatibilidad
        Long productoId,   // ID del producto/tipo de crédito configurado
        Long entidadId,    // Alias para productoId
        String usuario,    // Opcional: Usuario al que pertenece la simulación
        BigDecimal costoTotal, // ¿Cuánto cuesta el bien/servicio?
        Long creditTypeId  // Alias para productoId
) {
    public SimulacionClienteRequestDto(
            BigDecimal monto,
            String frecuencia,
            Integer plazo,
            SistemaAmortizacion sistema,
            String entidad,
            Long productoId
    ) {
        this(monto, frecuencia != null ? frecuencia : "MENSUAL", plazo, sistema, entidad, productoId, productoId, null, null, productoId);
    }

    public SimulacionClienteRequestDto(
            BigDecimal monto,
            String frecuencia,
            Integer plazo,
            SistemaAmortizacion sistema,
            String entidad,
            Long productoId,
            String usuario
    ) {
        this(monto, frecuencia != null ? frecuencia : "MENSUAL", plazo, sistema, entidad, productoId, productoId, usuario, null, productoId);
    }

    public SimulacionClienteRequestDto(
            BigDecimal monto,
            String frecuencia,
            Integer plazo,
            SistemaAmortizacion sistema,
            String entidad,
            Long productoId,
            Long entidadId,
            String usuario
    ) {
        this(monto, frecuencia != null ? frecuencia : "MENSUAL", plazo, sistema, entidad, productoId, entidadId, usuario, null, productoId);
    }

    public Long resolverProductoId() {
        if (productoId != null) return productoId;
        if (creditTypeId != null) return creditTypeId;
        return entidadId;
    }
}
