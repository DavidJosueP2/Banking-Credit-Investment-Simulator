package com.edu.uta.backend.domain.enums;

public enum TipoTasa {
    REFERENTIAL,         // Tasa referencial oficial (BCE, SEPS, BIESS)
    MAXIMUM,             // Tasa máxima legal permitida
    INSTITUTIONAL,       // Tasa ofertada por la institución
    ADMIN_CONFIGURED,    // Tasa ingresada manualmente por el administrador
    MARKET_REFERENCE,    // Tasa de referencia de mercado
    ACADEMIC             // Tasa para uso académico / demostración
}
