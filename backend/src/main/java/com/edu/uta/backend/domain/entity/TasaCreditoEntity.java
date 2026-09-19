package com.edu.uta.backend.domain.entity;

import com.edu.uta.backend.domain.enums.TipoTasa;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "tasa_credito", schema = "financiero")
public class TasaCreditoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private ProductoCreditoEntity producto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fuente_id")
    private FuenteTasaEntity fuente;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_tasa", nullable = false, length = 30)
    private TipoTasa tipoTasa = TipoTasa.ADMIN_CONFIGURED;

    @Column(length = 200)
    private String nombre;

    /** Valor porcentual. Ej: 15.7400 representa 15.74% */
    @Column(nullable = false, precision = 8, scale = 4)
    private BigDecimal valor;

    @Column(name = "fecha_vigencia", nullable = false)
    private LocalDate fechaVigencia;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "segmento_bce", length = 100)
    private String segmentoBce;

    @Column(name = "institucion_ref", length = 200)
    private String institucionRef;

    @Column(columnDefinition = "TEXT")
    private String observacion;

    @Column(name = "url_fuente", columnDefinition = "TEXT")
    private String urlFuente;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn;

    @PrePersist
    void prePersist() {
        creadoEn = OffsetDateTime.now();
        actualizadoEn = OffsetDateTime.now();
        if (fechaVigencia == null) fechaVigencia = LocalDate.now();
    }

    @PreUpdate
    void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
    }
}
