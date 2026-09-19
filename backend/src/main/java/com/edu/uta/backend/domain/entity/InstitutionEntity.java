package com.edu.uta.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "institucion_financiera", schema = "financiero")
public class InstitutionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(name = "nombre_comercial", length = 200)
    private String nombreComercial;

    @Column(length = 13)
    private String ruc;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(length = 500)
    private String direccion;

    @Column(length = 50)
    private String telefono;

    @Column(length = 150)
    private String email;

    @Column(name = "sitio_web", length = 300)
    private String sitioWeb;

    @Column(length = 100)
    private String ciudad;

    @Column(length = 100)
    private String provincia;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(columnDefinition = "TEXT")
    private String horarios;

    @Column(name = "color_primario", length = 20)
    private String colorPrimario = "#1e3a5f";

    @Column(name = "color_secundario", length = 20)
    private String colorSecundario = "#2e7d32";

    @Column(name = "info_legal", columnDefinition = "TEXT")
    private String infoLegal;

    @Column(name = "terminos_condiciones", columnDefinition = "TEXT")
    private String terminosCondiciones;

    @Column(name = "politica_privacidad", columnDefinition = "TEXT")
    private String politicaPrivacidad;

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
    }

    @PreUpdate
    void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
    }
}
