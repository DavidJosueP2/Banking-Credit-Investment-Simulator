package com.edu.uta.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum SegmentoCreditoBCE {
    CONSUMO_PRIORITARIO("Crédito de Consumo Prioritario"),
    CONSUMO_ORDINARIO("Crédito de Consumo Ordinario"),
    EDUCATIVO("Crédito Educativo"),
    MICROCREDITO_MINORISTA("Microcrédito Minorista"),
    MICROCREDITO_SIMPLE("Microcrédito Acumulación Simple"),
    MICROCREDITO_AMPLIADA("Microcrédito Acumulación Ampliada"),
    VIVIENDA_INMOBILIARIO("Crédito Hipotecario / Vivienda"),
    VIVIENDA_VIP("Vivienda de Interés Público (VIP)"),
    VIVIENDA_VIS("Vivienda de Interés Social (VIS)"),
    PRODUCTIVO_PYMES("Crédito Productivo PYMES"),
    PRODUCTIVO_EMPRESARIAL("Crédito Productivo Empresarial"),
    PRODUCTIVO_CORPORATIVO("Crédito Productivo Corporativo");

    private final String descripcion;

    SegmentoCreditoBCE(String descripcion) {
        this.descripcion = descripcion;
    }

    @Override
    public String toString() {
        return descripcion != null ? descripcion : name();
    }

    @JsonValue
    public String toValue() {
        return name();
    }

    @JsonCreator
    public static SegmentoCreditoBCE fromString(String valor) {
        if (valor == null || valor.isBlank()) {
            return CONSUMO_PRIORITARIO;
        }
        String clean = valor.trim().toUpperCase();
        for (SegmentoCreditoBCE s : values()) {
            if (s.name().equalsIgnoreCase(clean) || s.getDescripcion().equalsIgnoreCase(valor.trim())) {
                return s;
            }
        }
        if (clean.contains("EDUC")) return EDUCATIVO;
        if (clean.contains("VIVIENDA") || clean.contains("INMOB")) return VIVIENDA_INMOBILIARIO;
        if (clean.contains("VIP")) return VIVIENDA_VIP;
        if (clean.contains("VIS")) return VIVIENDA_VIS;
        if (clean.contains("MINORISTA")) return MICROCREDITO_MINORISTA;
        if (clean.contains("MICRO")) return MICROCREDITO_MINORISTA;
        if (clean.contains("PYME") || clean.contains("PROD")) return PRODUCTIVO_PYMES;
        if (clean.contains("ORDINARIO")) return CONSUMO_ORDINARIO;
        return CONSUMO_PRIORITARIO;
    }
}
