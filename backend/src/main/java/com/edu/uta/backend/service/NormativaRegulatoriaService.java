package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.ReglaNormativaEntity;
import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto.CargoConfiguracionDto;
import com.edu.uta.backend.repository.ReglaNormativaRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Límites de crédito vigentes. Todos se leen de {@code regla_normativa}, cada uno con su fuente:
 * las tasas máximas son del BCE (iguales para bancos y cooperativas); montos, plazos, desgravamen
 * y cobros indirectos son política prudencial de la institución y así se informan.
 */
@Service
public class NormativaRegulatoriaService {

    public static final String TASA_MAXIMA = "TASA_MAXIMA";
    public static final String TASA_REFERENCIAL = "TASA_REFERENCIAL";

    private static final Set<String> CATEGORIAS = Set.of("SEGURO", "GASTO", "DONACION", "OTRO");

    private final ReglaNormativaRepository reglaRepository;
    private final JdbcTemplate jdbc;

    public NormativaRegulatoriaService(ReglaNormativaRepository reglaRepository, JdbcTemplate jdbc) {
        this.reglaRepository = reglaRepository;
        this.jdbc = jdbc;
    }

    public record ReglaNormativaDto(Long id, String segmento, String tipoParametro, BigDecimal limite, String unidad,
                                    LocalDate fechaInicioVigencia, LocalDate fechaFinVigencia, String normativa,
                                    String resolucion, String organismo) {}

    public record Segmento(String codigo, String nombre, String descripcion, BigDecimal tasaMaxima,
                           BigDecimal tasaReferencial, BigDecimal montoMaximo, Integer plazoMaximoMeses,
                           String fuenteTasa, String resolucion, String urlFuente, LocalDate vigenteDesde) {}

    private record SegmentoRow(String codigo, String nombre, String descripcion) {}

    public record Rango(BigDecimal minimo, BigDecimal maximo, String fuente) {}

    public record LimitesCargos(BigDecimal porcentajeMensualMaximo, BigDecimal fijoMensualMaximo,
                                BigDecimal unicoPorcentajeMaximo, BigDecimal unicoFijoMaximo, int maximoPorProducto) {}

    /** Marco que usa el configurador del asesor: nada de esto está escrito en el frontend. */
    public record Marco(String tipoEntidad, LocalDate fecha, List<Segmento> segmentos, Rango desgravamen,
                        LimitesCargos cargos) {}

    @Transactional(readOnly = true)
    public List<ReglaNormativaDto> listarReglasVigentes(LocalDate fecha) {
        return reglaRepository.findAllVigentes(fecha != null ? fecha : LocalDate.now()).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Marco marco(String tipoEntidad, LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        return new Marco(tipoEntidad, f, segmentos(f, true), rangoDesgravamen(tipoEntidad, f), limitesCargos(f));
    }

    /** Segmentos con su tasa máxima vigente. Los inactivos (ya derogados) solo sirven para productos antiguos. */
    @Transactional(readOnly = true)
    public List<Segmento> segmentos(LocalDate fecha, boolean soloActivos) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        return jdbc.query("SELECT codigo, nombre, descripcion FROM segmento_regulatorio "
                        + (soloActivos ? "WHERE activo = TRUE " : "") + "ORDER BY orden, codigo",
                (rs, row) -> new SegmentoRow(rs.getString("codigo"), rs.getString("nombre"), rs.getString("descripcion")))
                .stream()
                .map(segmento -> {
                    Optional<ReglaNormativaEntity> tasa = regla(segmento.codigo(), TASA_MAXIMA, f);
                    return new Segmento(segmento.codigo(), segmento.nombre(), segmento.descripcion(),
                            tasa.map(ReglaNormativaEntity::getLimite).orElse(null),
                            limite(segmento.codigo(), TASA_REFERENCIAL, f).orElse(null),
                            limite(segmento.codigo(), "MONTO_MAXIMO", f).orElse(null),
                            limite(segmento.codigo(), "PLAZO_MAXIMO", f).map(BigDecimal::intValue).orElse(null),
                            tasa.map(ReglaNormativaEntity::getNormativa).orElse(null),
                            tasa.map(ReglaNormativaEntity::getResolucion).orElse(null),
                            tasa.map(ReglaNormativaEntity::getUrlFuente).orElse(null),
                            tasa.map(ReglaNormativaEntity::getFechaInicioVigencia).orElse(null));
                })
                .toList();
    }

    public boolean segmentoOfertable(String codigo) {
        Boolean activo = jdbc.query("SELECT activo FROM segmento_regulatorio WHERE codigo = ?",
                rs -> rs.next() ? rs.getBoolean("activo") : null, codigo);
        return Boolean.TRUE.equals(activo);
    }

    public BigDecimal tasaMaxima(String segmentoBce, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        return limite(key, TASA_MAXIMA, fecha != null ? fecha : LocalDate.now())
                .orElseThrow(() -> new NormativaFinancieraException(
                        "No hay una tasa máxima vigente registrada para el segmento '" + key
                                + "'. Actualiza la normativa antes de configurar o simular este producto."));
    }

    public void validarTasa(String segmentoBce, BigDecimal tasa, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        BigDecimal maxima = tasaMaxima(key, f);
        if (tasa == null || tasa.signum() <= 0) {
            throw new NormativaFinancieraException("La tasa de interés debe ser mayor a 0%.");
        }
        if (tasa.compareTo(maxima) > 0) {
            String fuente = regla(key, TASA_MAXIMA, f)
                    .map(r -> r.getNormativa() + (r.getResolucion() != null ? " (" + r.getResolucion() + ")" : ""))
                    .orElse("BCE");
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "La tasa ingresada (%.2f%%) supera la tasa activa efectiva máxima del %.2f%% fijada por el BCE para el segmento '%s'. Fuente: %s.",
                    tasa, maxima, key, fuente));
        }
    }

    public void validarMonto(String segmentoBce, BigDecimal montoMax, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        limite(key, "MONTO_MAXIMO", fecha != null ? fecha : LocalDate.now()).ifPresent(limite -> {
            if (montoMax.compareTo(limite) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El monto máximo ingresado ($%.2f) excede el límite de política institucional de $%.2f para el segmento '%s'.",
                        montoMax, limite, key));
            }
        });
    }

    public void validarPlazo(String segmentoBce, int plazoMaxMeses, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        limite(key, "PLAZO_MAXIMO", fecha != null ? fecha : LocalDate.now()).ifPresent(limite -> {
            if (plazoMaxMeses > limite.intValue()) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El plazo máximo ingresado (%d meses) excede el límite de política institucional de %d meses para el segmento '%s'.",
                        plazoMaxMeses, limite.intValue(), key));
            }
        });
    }

    public Rango rangoDesgravamen(String tipoEntidad, LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        String entidad = tipoEntidad == null ? "BANCO" : tipoEntidad.toUpperCase(Locale.ROOT);
        Optional<ReglaNormativaEntity> maximo = regla(entidad, "DESGRAVAMEN_MAXIMO", f);
        return new Rango(limite(entidad, "DESGRAVAMEN_MINIMO", f).orElse(BigDecimal.ZERO),
                maximo.map(ReglaNormativaEntity::getLimite).orElseThrow(() -> new NormativaFinancieraException(
                        "No hay un rango de desgravamen vigente para " + entidad.toLowerCase(Locale.ROOT) + ".")),
                maximo.map(ReglaNormativaEntity::getNormativa).orElse(null));
    }

    public void validarDesgravamen(String tipoEntidad, BigDecimal desgravamen, LocalDate fecha) {
        if (desgravamen == null) {
            throw new NormativaFinancieraException("Ingresa la tasa mensual del seguro de desgravamen.");
        }
        Rango rango = rangoDesgravamen(tipoEntidad, fecha);
        if (desgravamen.compareTo(rango.minimo()) < 0 || desgravamen.compareTo(rango.maximo()) > 0) {
            String entidad = "COOPERATIVA".equalsIgnoreCase(tipoEntidad) ? "una cooperativa" : "un banco";
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "Para %s, el desgravamen mensual (%.4f%%) debe estar entre %.4f%% y %.4f%% sobre el saldo. Fuente: %s.",
                    entidad, desgravamen, rango.minimo(), rango.maximo(), rango.fuente()));
        }
    }

    public LimitesCargos limitesCargos(LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        return new LimitesCargos(
                requerido("CARGO_PORCENTAJE_MENSUAL_MAXIMO", f),
                requerido("CARGO_FIJO_MENSUAL_MAXIMO", f),
                requerido("CARGO_UNICO_PORCENTAJE_MAXIMO", f),
                requerido("CARGO_UNICO_FIJO_MAXIMO", f),
                requerido("CARGOS_MAXIMOS_POR_PRODUCTO", f).intValue());
    }

    /**
     * Valida y normaliza los cobros indirectos (seguros, gastos, donaciones). La base de cálculo se
     * deduce del tipo y la periodicidad para que no existan combinaciones sin sentido.
     */
    public List<CargoConfiguracionDto> validarCargos(List<CargoConfiguracionDto> cargos, LocalDate fecha) {
        if (cargos == null || cargos.isEmpty()) return List.of();
        LimitesCargos limites = limitesCargos(fecha);
        if (cargos.size() > limites.maximoPorProducto()) {
            throw new NormativaFinancieraException("Un producto puede tener como máximo "
                    + limites.maximoPorProducto() + " cobros indirectos.");
        }
        Set<String> nombres = new HashSet<>();
        List<CargoConfiguracionDto> normalizados = new ArrayList<>();
        for (CargoConfiguracionDto cargo : cargos) {
            String nombre = cargo.nombre() == null ? "" : cargo.nombre().trim().replaceAll("\\s+", " ");
            if (nombre.length() < 3 || nombre.length() > 120) {
                throw new NormativaFinancieraException("Cada cobro indirecto necesita un nombre de 3 a 120 caracteres.");
            }
            if (!nombres.add(nombre.toLowerCase(Locale.ROOT))) {
                throw new NormativaFinancieraException("El cobro '" + nombre + "' está repetido.");
            }
            if (nombre.toLowerCase(Locale.ROOT).contains("desgravamen")) {
                throw new NormativaFinancieraException(
                        "El seguro de desgravamen se configura en su propio campo, no como cobro indirecto.");
            }
            String categoria = upper(cargo.categoria(), "GASTO");
            if (!CATEGORIAS.contains(categoria)) {
                throw new NormativaFinancieraException("La categoría de '" + nombre + "' no es válida.");
            }
            String tipo = upper(cargo.tipoCargo(), "");
            if (!tipo.equals("FIJO") && !tipo.equals("PORCENTAJE")) {
                throw new NormativaFinancieraException("Indica si '" + nombre + "' es un valor fijo o un porcentaje.");
            }
            String periodicidad = upper(cargo.periodicidad(), "");
            if (!periodicidad.equals("MENSUAL") && !periodicidad.equals("UNICO")) {
                throw new NormativaFinancieraException("Indica si '" + nombre + "' se cobra en cada cuota o una sola vez.");
            }
            String base;
            if (tipo.equals("FIJO")) {
                base = "FIJO";
            } else if (periodicidad.equals("UNICO")) {
                base = "MONTO_SOLICITADO";
            } else {
                base = upper(cargo.baseCalculo(), "SALDO_DEUDOR");
                if (!base.equals("SALDO_DEUDOR") && !base.equals("MONTO_SOLICITADO")) {
                    throw new NormativaFinancieraException("Un porcentaje mensual se calcula sobre el saldo o sobre el monto solicitado.");
                }
            }
            BigDecimal valor = cargo.valor();
            if (valor == null || valor.signum() <= 0) {
                throw new NormativaFinancieraException("El valor de '" + nombre + "' debe ser mayor a 0.");
            }
            if (valor.stripTrailingZeros().scale() > 4) {
                throw new NormativaFinancieraException("El valor de '" + nombre + "' admite hasta 4 decimales.");
            }
            BigDecimal tope = tipo.equals("PORCENTAJE")
                    ? periodicidad.equals("MENSUAL") ? limites.porcentajeMensualMaximo() : limites.unicoPorcentajeMaximo()
                    : periodicidad.equals("MENSUAL") ? limites.fijoMensualMaximo() : limites.unicoFijoMaximo();
            if (valor.compareTo(tope) > 0) {
                String unidad = tipo.equals("PORCENTAJE") ? "%" : " USD";
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "'%s' (%s%s %s) supera el tope prudencial de %s%s %s.", nombre, valor.stripTrailingZeros().toPlainString(),
                        unidad, periodicidad.equals("MENSUAL") ? "por cuota" : "único",
                        tope.stripTrailingZeros().toPlainString(), unidad,
                        periodicidad.equals("MENSUAL") ? "por cuota" : "único"));
            }
            boolean obligatorio = cargo.obligatorio() == null || cargo.obligatorio();
            if (categoria.equals("DONACION") && obligatorio) {
                throw new NormativaFinancieraException("La donación '" + nombre
                        + "' no puede ser obligatoria: el cliente decide si la agrega.");
            }
            String norma = cargo.normaAplicable() == null || cargo.normaAplicable().isBlank()
                    ? null : cargo.normaAplicable().trim();
            if (norma != null && norma.length() > 200) {
                throw new NormativaFinancieraException("La referencia normativa de '" + nombre + "' es demasiado larga.");
            }
            normalizados.add(new CargoConfiguracionDto(nombre, tipo, valor, periodicidad, base, norma, obligatorio, categoria));
        }
        return normalizados;
    }

    public String normalizarSegmentoKey(String input) {
        if (input == null || input.isBlank()) return "CONSUMO_PRIORITARIO";
        String s = input.toUpperCase(Locale.ROOT).trim();
        Integer exacto = jdbc.queryForObject("SELECT count(*) FROM segmento_regulatorio WHERE codigo = ?", Integer.class, s);
        if (exacto != null && exacto > 0) return s;
        if (s.contains("MICRO")) {
            if (s.contains("MIN")) return "MICROCREDITO_MINORISTA";
            if (s.contains("AMPLI")) return "MICROCREDITO_AMPLIADA";
            return "MICROCREDITO_SIMPLE";
        }
        if (s.contains("VIP")) return "VIVIENDA_VIP";
        if (s.contains("VIS")) return "VIVIENDA_VIS";
        if (s.contains("VIVIENDA") || s.contains("INMOB")) return "INMOBILIARIO";
        if (s.contains("CORP")) return "PRODUCTIVO_CORPORATIVO";
        if (s.contains("EMPRE")) return "PRODUCTIVO_EMPRESARIAL";
        if (s.contains("PYME") || s.contains("PROD")) return "PRODUCTIVO_PYMES";
        if (s.contains("EDUC")) return s.contains("SOCIAL") ? "EDUCATIVO_SOCIAL" : "EDUCATIVO";
        if (s.contains("ORDINARIO")) return "CONSUMO_ORDINARIO";
        return "CONSUMO_PRIORITARIO";
    }

    private BigDecimal requerido(String tipo, LocalDate fecha) {
        return limite("CARGOS", tipo, fecha).orElseThrow(() -> new NormativaFinancieraException(
                "Falta la regla vigente " + tipo + " para validar los cobros indirectos."));
    }

    private Optional<BigDecimal> limite(String segmento, String tipo, LocalDate fecha) {
        return regla(segmento, tipo, fecha).map(ReglaNormativaEntity::getLimite);
    }

    private Optional<ReglaNormativaEntity> regla(String segmento, String tipo, LocalDate fecha) {
        return reglaRepository.findReglaVigente(segmento, tipo, fecha);
    }

    private static String upper(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }

    private ReglaNormativaDto toDto(ReglaNormativaEntity e) {
        return new ReglaNormativaDto(e.getId(), e.getSegmento(), e.getTipoParametro(), e.getLimite(), e.getUnidad(),
                e.getFechaInicioVigencia(), e.getFechaFinVigencia(), e.getNormativa(), e.getResolucion(),
                e.getOrganismo());
    }
}
