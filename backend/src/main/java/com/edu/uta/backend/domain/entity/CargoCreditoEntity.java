package com.edu.uta.backend.domain.entity;

import com.edu.uta.backend.domain.enums.TipoCargo;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "cargo_credito", schema = "financiero")
public class CargoCreditoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private ProductoCreditoEntity producto;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cargo", nullable = false, length = 20)
    private TipoCargo tipoCargo = TipoCargo.FIJO;

    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal valor = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean obligatorio = true;

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
