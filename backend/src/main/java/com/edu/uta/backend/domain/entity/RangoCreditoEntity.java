package com.edu.uta.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "rango_credito", schema = "financiero")
public class RangoCreditoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private ProductoCreditoEntity producto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tasa_id")
    private TasaCreditoEntity tasa;

    @Column(name = "monto_min", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoMin;

    @Column(name = "monto_max", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoMax;

    @Column(name = "plazo_min_meses", nullable = false)
    private Integer plazoMinMeses;

    @Column(name = "plazo_max_meses", nullable = false)
    private Integer plazoMaxMeses;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @PrePersist
    void prePersist() {
        creadoEn = OffsetDateTime.now();
    }
}
