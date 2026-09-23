package com.edu.uta.backend.domain.enums;

public enum TipoGarantia {
    QUIROGRAFARIO,   // Respaldado por firma del deudor
    HIPOTECARIO,     // Respaldado con bien inmueble
    PRENDARIO,       // Respaldado con bien mueble
    PERSONAL,        // Garantía personal de tercero
    GARANTE,         // Garante solidario
    LIQUIDA,         // Garantía líquida (depósito/inversión)
    SIN_GARANTIA     // Sin garantía específica
}
