package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.CargoCreditoEntity;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.SegmentoCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.entity.TipoCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.domain.enums.TipoCargo;
import com.edu.uta.backend.domain.enums.TipoTasa;
import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto;
import com.edu.uta.backend.dto.ConfigurarCreditoResponseDto;
import com.edu.uta.backend.dto.ConfigurarCreditoResponseDto.CargoResponseDto;
import com.edu.uta.backend.repository.CargoCreditoRepository;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.SegmentoCreditoRepository;
import com.edu.uta.backend.repository.TasaCreditoRepository;
import com.edu.uta.backend.repository.TipoCreditoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreditoConfiguracionService {

    private final ProductoCreditoRepository productoRepository;
    private final TipoCreditoRepository tipoCreditoRepository;
    private final SegmentoCreditoRepository segmentoRepository;
    private final TasaCreditoRepository tasaCreditoRepository;
    private final CargoCreditoRepository cargoCreditoRepository;
    private final NormativaRegulatoriaService normativaService;

    // ─── Normativa Oficial Banco Central del Ecuador (BCE) ────────────────────
    public record ReglaSegmentoBce(
            String codigo,
            String nombreOficial,
            BigDecimal tasaMaximaLegal,
            BigDecimal montoMaximoLegal,
            Integer plazoMaximoMesesLegal
    ) {}

    private static final Map<String, ReglaSegmentoBce> REGLAS_BCE = new LinkedHashMap<>();

    static {
        // Productivo
        REGLAS_BCE.put("PRODUCTIVO_CORPORATIVO", new ReglaSegmentoBce("PRODUCTIVO_CORPORATIVO", "Productivo Corporativo", new BigDecimal("9.33"), null, 60));
        REGLAS_BCE.put("PRODUCTIVO_EMPRESARIAL", new ReglaSegmentoBce("PRODUCTIVO_EMPRESARIAL", "Productivo Empresarial", new BigDecimal("10.21"), null, 144));
        REGLAS_BCE.put("PRODUCTIVO_PYMES", new ReglaSegmentoBce("PRODUCTIVO_PYMES", "Productivo PYMES", new BigDecimal("11.83"), new BigDecimal("1000000.00"), 120));

        // Consumo
        REGLAS_BCE.put("CONSUMO_PRIORITARIO", new ReglaSegmentoBce("CONSUMO_PRIORITARIO", "Consumo Prioritario", new BigDecimal("16.77"), new BigDecimal("30000.00"), 60));
        REGLAS_BCE.put("CONSUMO_ORDINARIO", new ReglaSegmentoBce("CONSUMO_ORDINARIO", "Consumo Ordinario", new BigDecimal("17.30"), new BigDecimal("30000.00"), 60));

        // Vivienda / Inmobiliario
        REGLAS_BCE.put("INMOBILIARIO", new ReglaSegmentoBce("INMOBILIARIO", "Inmobiliario", new BigDecimal("10.40"), new BigDecimal("500000.00"), 240));
        REGLAS_BCE.put("VIVIENDA_VIP", new ReglaSegmentoBce("VIVIENDA_VIP", "Vivienda de Interés Público (VIP)", new BigDecimal("4.99"), new BigDecimal("105000.00"), 360));
        REGLAS_BCE.put("VIVIENDA_VIS", new ReglaSegmentoBce("VIVIENDA_VIS", "Vivienda de Interés Social (VIS)", new BigDecimal("4.99"), new BigDecimal("80000.00"), 360));

        // Microcrédito
        REGLAS_BCE.put("MICROCREDITO_MINORISTA", new ReglaSegmentoBce("MICROCREDITO_MINORISTA", "Microcrédito Minorista", new BigDecimal("28.23"), new BigDecimal("3000.00"), 36));
        REGLAS_BCE.put("MICROCREDITO_SIMPLE", new ReglaSegmentoBce("MICROCREDITO_SIMPLE", "Microcrédito Acumulación Simple", new BigDecimal("25.50"), new BigDecimal("10000.00"), 48));
        REGLAS_BCE.put("MICROCREDITO_AMPLIADA", new ReglaSegmentoBce("MICROCREDITO_AMPLIADA", "Microcrédito Acumulación Ampliada", new BigDecimal("25.50"), new BigDecimal("30000.00"), 60));

        // Educativo
        REGLAS_BCE.put("EDUCATIVO", new ReglaSegmentoBce("EDUCATIVO", "Educativo", new BigDecimal("9.50"), new BigDecimal("20000.00"), 84));
    }

    public static Map<String, ReglaSegmentoBce> getReglasBce() {
        return Collections.unmodifiableMap(REGLAS_BCE);
    }

    @Transactional
    public ConfigurarCreditoResponseDto configurar(ConfigurarCreditoRequestDto dto) {
        log.info("Asesor configurando producto de crédito: '{}', entidad: '{}', segmento: '{}'",
                dto.nombre(), dto.entidad(), dto.segmentoBce());

        // 1. Validaciones básicas de rangos
        if (dto.montoMin().compareTo(BigDecimal.ZERO) <= 0) {
            throw new NormativaFinancieraException("El monto mínimo debe ser mayor a 0");
        }
        if (dto.montoMax().compareTo(dto.montoMin()) < 0) {
            throw new NormativaFinancieraException("El monto máximo ($" + dto.montoMax() + ") no puede ser menor al monto mínimo ($" + dto.montoMin() + ")");
        }
        if (dto.plazoMinMeses() <= 0) {
            throw new NormativaFinancieraException("El plazo mínimo debe ser de al menos 1 mes");
        }
        if (dto.plazoMaxMeses() < dto.plazoMinMeses()) {
            throw new NormativaFinancieraException("El plazo máximo (" + dto.plazoMaxMeses() + " meses) no puede ser menor al plazo mínimo (" + dto.plazoMinMeses() + " meses)");
        }
        if (dto.sistemasPermitidos() == null || dto.sistemasPermitidos().isEmpty()) {
            throw new NormativaFinancieraException("Debe seleccionar al menos un sistema de amortización permitido (FRANCES o ALEMAN)");
        }
        if (dto.tasaDesgravamenMensual() != null && dto.tasaDesgravamenMensual().compareTo(new BigDecimal("0.30")) > 0) {
            throw new NormativaFinancieraException("La tasa de desgravamen mensual (" + dto.tasaDesgravamenMensual() + "%) excede el rango prudencial financiero (máximo 0.30% mensual)");
        }

        // 2. Validación de Normativa del Banco Central del Ecuador (BCE)
        validarNormativaBce(dto);

        // 3. Obtener o asignar un Tipo de Crédito padre
        TipoCreditoEntity tipoCredito = resolverTipoCredito(dto.segmentoBce(), dto.nombre());

        // 4. Crear y guardar ProductoCreditoEntity
        ProductoCreditoEntity producto = new ProductoCreditoEntity();
        producto.setTipoCredito(tipoCredito);
        producto.setNombre(dto.nombre().trim());
        producto.setDescripcion(dto.descripcion() != null ? dto.descripcion().trim() : "Configurado por asesor");
        producto.setEntidad(dto.entidad().trim());
        producto.setSegmentoBce(dto.segmentoBce().trim());
        producto.setMontoMin(dto.montoMin());
        producto.setMontoMax(dto.montoMax());
        producto.setPlazoMinMeses(dto.plazoMinMeses());
        producto.setPlazoMaxMeses(dto.plazoMaxMeses());
        producto.setUnidadPlazo(dto.unidadPlazo() != null ? dto.unidadPlazo().trim().toUpperCase() : "MESES");
        producto.setTasaDesgravamenMensual(dto.tasaDesgravamenMensual() != null ? dto.tasaDesgravamenMensual() : new BigDecimal("0.0600"));

        String sistemasJoined = dto.sistemasPermitidos().stream()
                .map(Enum::name)
                .collect(Collectors.joining(","));
        producto.setSistemasPermitidos(sistemasJoined);
        producto.setActivo(true);

        producto = productoRepository.save(producto);

        // 5. Crear la Tasa asociada al producto
        TasaCreditoEntity tasa = new TasaCreditoEntity();
        tasa.setProducto(producto);
        tasa.setTipoTasa(TipoTasa.ADMIN_CONFIGURED);
        tasa.setNombre("Tasa activa configurada - " + dto.nombre());
        tasa.setValor(dto.tasaInteres());
        tasa.setFechaVigencia(LocalDate.now());
        tasa.setSegmentoBce(dto.segmentoBce());
        tasa.setObservacion("Configurada según resolución BCE por asesor");
        tasa.setActivo(true);
        tasaCreditoRepository.save(tasa);

        // 6. Guardar Cargos Indirectos si fueron especificados
        List<CargoResponseDto> cargosCreados = new ArrayList<>();
        if (dto.cargosIndirectos() != null && !dto.cargosIndirectos().isEmpty() && cargoCreditoRepository != null) {
            for (var cDto : dto.cargosIndirectos()) {
                CargoCreditoEntity cargo = new CargoCreditoEntity();
                cargo.setProducto(producto);
                cargo.setNombre(cDto.nombre().trim());
                cargo.setTipoCargo("PORCENTAJE".equalsIgnoreCase(cDto.tipoCargo()) ? TipoCargo.PORCENTAJE : TipoCargo.FIJO);
                cargo.setValor(cDto.valor());
                cargo.setPeriodicidad(cDto.periodicidad() != null ? cDto.periodicidad().trim().toUpperCase() : "MENSUAL");
                cargo.setBaseCalculo(cDto.baseCalculo() != null ? cDto.baseCalculo().trim().toUpperCase() : "SALDO_DEUDOR");
                cargo.setNormaAplicable(cDto.normaAplicable());
                cargo.setObligatorio(cDto.obligatorio() != null ? cDto.obligatorio() : true);
                cargo.setActivo(true);
                CargoCreditoEntity saved = cargoCreditoRepository.save(cargo);
                cargosCreados.add(new CargoResponseDto(
                        saved.getId(), saved.getNombre(), saved.getTipoCargo().name(),
                        saved.getValor(), saved.getPeriodicidad(), saved.getBaseCalculo(),
                        saved.getNormaAplicable(), saved.getObligatorio()
                ));
            }
        }

        return toResponseDto(producto, dto.tasaInteres(), dto.sistemasPermitidos(), cargosCreados);
    }

    @Transactional(readOnly = true)
    public List<ConfigurarCreditoResponseDto> listarConfigurados() {
        return productoRepository.findAllByActivoTrueOrderByIdDesc().stream()
                .map(p -> {
                    BigDecimal tasaValor = p.getTasas().stream()
                            .filter(TasaCreditoEntity::getActivo)
                            .findFirst()
                            .map(TasaCreditoEntity::getValor)
                            .orElse(new BigDecimal("15.50"));

                    List<SistemaAmortizacion> sistemas = parseSistemas(p.getSistemasPermitidos());

                    List<CargoResponseDto> cargos = p.getCargos() != null
                            ? p.getCargos().stream()
                            .filter(CargoCreditoEntity::getActivo)
                            .map(c -> new CargoResponseDto(
                                    c.getId(), c.getNombre(), c.getTipoCargo().name(),
                                    c.getValor(), c.getPeriodicidad(), c.getBaseCalculo(),
                                    c.getNormaAplicable(), c.getObligatorio()
                            )).toList()
                            : List.of();

                    return toResponseDto(p, tasaValor, sistemas, cargos);
                })
                .toList();
    }

    // ─── Validaciones Normativas BCE ─────────────────────────────────────────

    private void validarNormativaBce(ConfigurarCreditoRequestDto dto) {
        if (normativaService != null) {
            normativaService.validarTasa(dto.segmentoBce(), dto.tasaInteres(), LocalDate.now());
            normativaService.validarMonto(dto.segmentoBce(), dto.montoMax(), LocalDate.now());
            normativaService.validarPlazo(dto.segmentoBce(), dto.plazoMaxMeses(), LocalDate.now());
            normativaService.validarDesgravamen(dto.entidad(), dto.tasaDesgravamenMensual());

            if (dto.cargosIndirectos() != null) {
                for (var cargo : dto.cargosIndirectos()) {
                    normativaService.validarCargoIndirecto(cargo.nombre(), cargo.tipoCargo(), cargo.valor(), cargo.baseCalculo());
                }
            }
            return;
        }

        // Validación de respaldo si normativaService fuese nulo
        String key = normalizarSegmentoKey(dto.segmentoBce());
        ReglaSegmentoBce regla = REGLAS_BCE.get(key);

        if (regla != null) {
            if (dto.tasaInteres().compareTo(regla.tasaMaximaLegal()) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "La tasa ingresada (%.2f%%) supera la tasa máxima legal del %.2f%% permitida por el Banco Central del Ecuador (BCE) para el segmento '%s'.",
                        dto.tasaInteres(), regla.tasaMaximaLegal(), regla.nombreOficial()
                ));
            }
            if (regla.montoMaximoLegal() != null && dto.montoMax().compareTo(regla.montoMaximoLegal()) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El monto máximo ingresado ($%.2f) excede el tope legal de $%.2f fijado por la Junta de Política y Regulación Financiera para el segmento '%s'.",
                        dto.montoMax(), regla.montoMaximoLegal(), regla.nombreOficial()
                ));
            }
            if (regla.plazoMaximoMesesLegal() != null && dto.plazoMaxMeses() > regla.plazoMaximoMesesLegal()) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El plazo máximo ingresado (%d meses) excede el límite normativo de %d meses fijado para el segmento '%s'.",
                        dto.plazoMaxMeses(), regla.plazoMaximoMesesLegal(), regla.nombreOficial()
                ));
            }
        }

        if (dto.entidad() != null) {
            String entidadNorm = dto.entidad().trim().toLowerCase(Locale.ROOT);
            if (entidadNorm.contains("banco")) {
                if (dto.tasaDesgravamenMensual() != null && dto.tasaDesgravamenMensual().compareTo(new BigDecimal("0.0650")) > 0) {
                    throw new NormativaFinancieraException(String.format(Locale.ROOT,
                            "Para Bancos, la tasa de desgravamen mensual (%.4f%%) excede el tope legal de 0.0650%% mensual fijado por la Superintendencia de Bancos.",
                            dto.tasaDesgravamenMensual()));
                }
                if (key.startsWith("MICROCREDITO")) {
                    throw new NormativaFinancieraException("Los segmentos de Microcrédito corresponden normativamente al sector cooperativo y microfinanciero, no a Banca Comercial.");
                }
            } else if (entidadNorm.contains("cooperativa")) {
                if (dto.tasaDesgravamenMensual() != null &&
                        (dto.tasaDesgravamenMensual().compareTo(new BigDecimal("0.0400")) < 0 ||
                         dto.tasaDesgravamenMensual().compareTo(new BigDecimal("0.1200")) > 0)) {
                    throw new NormativaFinancieraException(String.format(Locale.ROOT,
                            "Para Cooperativas, la tasa de desgravamen mensual (%.4f%%) debe ubicarse en el rango normativo de la SEPS (0.0400%% a 0.1200%% mensual).",
                            dto.tasaDesgravamenMensual()));
                }
            }
        }
    }

    private String normalizarSegmentoKey(String input) {
        if (input == null) return "CONSUMO_PRIORITARIO";
        String s = input.toUpperCase().trim();
        for (String key : REGLAS_BCE.keySet()) {
            if (s.contains(key) || key.contains(s)) return key;
        }
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
        if (s.contains("EDUC")) return "EDUCATIVO";
        if (s.contains("ORDINARIO")) return "CONSUMO_ORDINARIO";
        return "CONSUMO_PRIORITARIO";
    }

    private TipoCreditoEntity resolverTipoCredito(String segmentoBce, String nombreProducto) {
        String codigoSegmento = mapearCodigoSegmento(segmentoBce);
        SegmentoCreditoEntity segmento = segmentoRepository.findByCodigo(codigoSegmento)
                .or(() -> segmentoRepository.findAll().stream().findFirst())
                .orElseGet(() -> {
                    SegmentoCreditoEntity s = new SegmentoCreditoEntity();
                    s.setCodigo(codigoSegmento);
                    s.setNombre(segmentoBce);
                    s.setActivo(true);
                    return segmentoRepository.save(s);
                });

        return tipoCreditoRepository.findAllBySegmentoIdAndActivoTrueOrderByOrdenAsc(segmento.getId())
                .stream().findFirst()
                .orElseGet(() -> {
                    TipoCreditoEntity t = new TipoCreditoEntity();
                    t.setSegmento(segmento);
                    t.setNombre(nombreProducto);
                    t.setDescripcion("Generado automáticamente para configuración de asesor");
                    t.setActivo(true);
                    return tipoCreditoRepository.save(t);
                });
    }

    private String mapearCodigoSegmento(String segmentoBce) {
        String s = segmentoBce != null ? segmentoBce.toUpperCase() : "";
        if (s.contains("CONSUMO")) return "CONSUMO";
        if (s.contains("MICRO")) return "MICROCREDITO";
        if (s.contains("VIVIENDA") || s.contains("INMOB")) return "VIVIENDA";
        if (s.contains("PROD") || s.contains("PYME") || s.contains("CORP")) return "PRODUCTIVO";
        if (s.contains("EDUC")) return "EDUCACION";
        return "CONSUMO";
    }

    private List<SistemaAmortizacion> parseSistemas(String sistemasCsv) {
        if (sistemasCsv == null || sistemasCsv.isBlank()) {
            return List.of(SistemaAmortizacion.FRANCES, SistemaAmortizacion.ALEMAN);
        }
        List<SistemaAmortizacion> result = new ArrayList<>();
        for (String part : sistemasCsv.split(",")) {
            try {
                result.add(SistemaAmortizacion.valueOf(part.trim().toUpperCase()));
            } catch (Exception ignored) {}
        }
        return result.isEmpty() ? List.of(SistemaAmortizacion.FRANCES) : result;
    }

    private ConfigurarCreditoResponseDto toResponseDto(
            ProductoCreditoEntity p,
            BigDecimal tasaInteres,
            List<SistemaAmortizacion> sistemas,
            List<CargoResponseDto> cargos
    ) {
        return new ConfigurarCreditoResponseDto(
                p.getId(),
                p.getNombre(),
                p.getEntidad() != null ? p.getEntidad() : "Banco",
                p.getSegmentoBce() != null ? p.getSegmentoBce() : "Consumo Prioritario",
                p.getMontoMin(),
                p.getMontoMax(),
                p.getPlazoMinMeses(),
                p.getPlazoMaxMeses(),
                tasaInteres,
                p.getTasaDesgravamenMensual() != null ? p.getTasaDesgravamenMensual() : new BigDecimal("0.0600"),
                sistemas,
                p.getDescripcion(),
                p.getActivo(),
                p.getCreadoEn(),
                p.getUnidadPlazo() != null ? p.getUnidadPlazo() : "MESES",
                cargos
        );
    }
}
