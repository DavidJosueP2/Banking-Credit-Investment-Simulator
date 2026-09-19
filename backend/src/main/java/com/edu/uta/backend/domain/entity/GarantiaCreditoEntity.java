package com.edu.uta.backend.domain.entity;

import com.edu.uta.backend.domain.enums.TipoGarantia;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "garantia_credito", schema = "financiero")
public class GarantiaCreditoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private ProductoCreditoEntity producto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_garantia", nullable = false, length = 30)
    private TipoGarantia tipoGarantia;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private Boolean obligatoria = false;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @PrePersist
    void prePersist() {
        creadoEn = OffsetDateTime.now();
    }
}
