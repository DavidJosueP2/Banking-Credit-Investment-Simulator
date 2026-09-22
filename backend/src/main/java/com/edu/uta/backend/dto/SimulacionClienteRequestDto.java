package com.edu.uta.backend.dto;

import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SimulacionClienteRequestDto(
        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "50.00", message = "El monto debe ser mínimo $50")
        BigDecimal monto,

        @NotBlank(message = "La frecuencia de pago es obligatoria (MENSUAL o ANUAL)")
        String frecuencia, // MENSUAL o ANUAL

        @NotNull(message = "El plazo es obligatorio")
        Integer plazo,     // en meses o años según la frecuencia

        @NotNull(message = "El sistema de amortización es obligatorio (FRANCES o ALEMAN)")
        SistemaAmortizacion sistema,

        String entidad,    // Opcional: Banco o Cooperativa
        Long productoId,   // Opcional: ID de producto específico para validar aislamiento de entidad
        String usuario     // Opcional: Usuario al que pertenece la simulación
) {
    public SimulacionClienteRequestDto(
            BigDecimal monto,
            String frecuencia,
            Integer plazo,
            SistemaAmortizacion sistema,
            String entidad,
            Long productoId
    ) {
        this(monto, frecuencia, plazo, sistema, entidad, productoId, null);
    }
}
