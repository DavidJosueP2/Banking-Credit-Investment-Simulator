package com.edu.uta.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "regla_normativa", schema = "financiero")
public class ReglaNormativaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String segmento;

    @Column(name = "tipo_parametro", nullable = false, length = 50)
    private String tipoParametro; // TASA_MAXIMA, MONTO_MAXIMO, PLAZO_MAXIMO, DESGRAVAMEN_MAXIMO, CARGO_MAXIMO

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal limite;

    @Column(nullable = false, length = 20)
    private String unidad; // PORCENTAJE, USD, MESES

    @Column(name = "fecha_inicio_vigencia", nullable = false)
    private LocalDate fechaInicioVigencia;

    @Column(name = "fecha_fin_vigencia")
    private LocalDate fechaFinVigencia;

    @Column(nullable = false, length = 200)
    private String normativa;

    @Column(length = 100)
    private String resolucion;

    @Column(nullable = false, length = 50)
    private String organismo = "BCE";

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @PrePersist
    void prePersist() {
        creadoEn = OffsetDateTime.now();
    }
}
