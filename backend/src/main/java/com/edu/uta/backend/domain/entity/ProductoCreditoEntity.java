package com.edu.uta.backend.domain.entity;

import com.edu.uta.backend.domain.enums.SegmentoCreditoBCE;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "producto_credito", schema = "financiero")
public class ProductoCreditoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tipo_credito_id", nullable = false)
    private TipoCreditoEntity tipoCredito;

    @Column(nullable = false, length = 200)
    private String nombre;

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public void setNombre(SegmentoCreditoBCE nombreEnum) {
        this.nombre = nombreEnum != null ? nombreEnum.getDescripcion() : null;
    }

    public SegmentoCreditoBCE getNombreEnum() {
        return SegmentoCreditoBCE.fromString(this.nombre);
    }

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "plazo_min_meses", nullable = false)
    private Integer plazoMinMeses = 1;

    @Column(name = "plazo_max_meses", nullable = false)
    private Integer plazoMaxMeses = 360;

    @Column(name = "monto_min", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoMin = new BigDecimal("100.00");

    @Column(name = "monto_max", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoMax = new BigDecimal("1000000.00");

    @Column(name = "requiere_garante", nullable = false)
    private Boolean requiereGarante = false;

    @Column(length = 100)
    private String entidad = "Banco";

    @Column(name = "sistemas_permitidos", length = 100)
    private String sistemasPermitidos = "FRANCES,ALEMAN";

    @Column(name = "tasa_desgravamen_mensual", precision = 8, scale = 4)
    private BigDecimal tasaDesgravamenMensual = new BigDecimal("0.0600");

    @Column(name = "segmento_bce", length = 100)
    private String segmentoBce = "Consumo Prioritario";

    @Column(name = "unidad_plazo", length = 20)
    private String unidadPlazo = "MESES";

    @Column(name = "imagen_url", columnDefinition = "TEXT")
    private String imagenUrl;

    @Column(nullable = false)
    private Integer orden = 0;

    @Column(nullable = false)
    private Boolean activo = true;

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TasaCreditoEntity> tasas = new ArrayList<>();

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RangoCreditoEntity> rangos = new ArrayList<>();

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CargoCreditoEntity> cargos = new ArrayList<>();

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SeguroCreditoEntity> seguros = new ArrayList<>();

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<GarantiaCreditoEntity> garantias = new ArrayList<>();

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
