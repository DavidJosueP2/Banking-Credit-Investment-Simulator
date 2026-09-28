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
import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto.CargoConfiguracionDto;
import com.edu.uta.backend.dto.ConfigurarCreditoResponseDto;
import com.edu.uta.backend.dto.ConfigurarCreditoResponseDto.CargoResponseDto;
import com.edu.uta.backend.repository.CargoCreditoRepository;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.SegmentoCreditoRepository;
import com.edu.uta.backend.repository.TasaCreditoRepository;
import com.edu.uta.backend.repository.TipoCreditoRepository;
import com.edu.uta.backend.settings.InstitutionSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Productos de crédito que crea el asesor. El nombre es libre; el segmento, la tasa máxima y los
 * rangos salen de la normativa vigente, y el tipo de entidad de la configuración institucional.
 */
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
    private final InstitutionSettingsService settings;

    public NormativaRegulatoriaService.Marco marco() {
        return normativaService.marco(settings.entityType(), LocalDate.now());
    }

    @Transactional
    public ConfigurarCreditoResponseDto configurar(ConfigurarCreditoRequestDto dto) {
        List<CargoConfiguracionDto> cargos = validar(dto, null);
        log.info("Asesor configurando producto de crédito '{}' en el segmento '{}'", dto.nombre(), dto.segmentoBce());

        ProductoCreditoEntity producto = new ProductoCreditoEntity();
        aplicar(producto, dto);
        producto.setActivo(true);
        producto = productoRepository.save(producto);

        TasaCreditoEntity tasa = new TasaCreditoEntity();
        tasa.setProducto(producto);
        tasa.setTipoTasa(TipoTasa.ADMIN_CONFIGURED);
        tasa.setFechaVigencia(LocalDate.now());
        guardarTasa(tasa, dto);

        return toResponseDto(producto, dto.tasaInteres(), parseSistemas(producto.getSistemasPermitidos()),
                guardarCargos(producto, cargos));
    }

    @Transactional
    public ConfigurarCreditoResponseDto actualizar(Long id, ConfigurarCreditoRequestDto dto) {
        ProductoCreditoEntity producto = productoRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Producto de crédito no encontrado con ID: " + id));
        List<CargoConfiguracionDto> cargos = validar(dto, producto.getSegmentoBce());
        log.info("Actualizando producto de crédito id {} ('{}')", id, dto.nombre());

        aplicar(producto, dto);
        producto = productoRepository.save(producto);

        List<TasaCreditoEntity> tasas = tasaCreditoRepository.findAllByProductoIdAndActivoTrueOrderByFechaVigenciaDesc(producto.getId());
        TasaCreditoEntity tasa = tasas.isEmpty() ? new TasaCreditoEntity() : tasas.getFirst();
        if (tasas.isEmpty()) {
            tasa.setProducto(producto);
            tasa.setTipoTasa(TipoTasa.ADMIN_CONFIGURED);
        }
        tasa.setFechaVigencia(LocalDate.now());
        guardarTasa(tasa, dto);

        for (CargoCreditoEntity previo : cargoCreditoRepository.findAllByProductoId(producto.getId())) {
            previo.setActivo(false);
            cargoCreditoRepository.save(previo);
        }
        return toResponseDto(producto, dto.tasaInteres(), parseSistemas(producto.getSistemasPermitidos()),
                guardarCargos(producto, cargos));
    }

    @Transactional(readOnly = true)
    public List<ConfigurarCreditoResponseDto> listarConfigurados() {
        return productoRepository.findAllByOrderByIdDesc().stream()
                .map(p -> toResponseDto(p, tasaActiva(p), parseSistemas(p.getSistemasPermitidos()), cargosActivos(p)))
                .toList();
    }

    @Transactional
    public ConfigurarCreditoResponseDto cambiarEstado(Long id, Boolean active) {
        ProductoCreditoEntity p = productoRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Producto no encontrado: " + id));
        boolean nuevoEstado = active != null ? active : !Boolean.TRUE.equals(p.getActivo());
        if (nuevoEstado && tasaActiva(p) == null) {
            throw new NormativaFinancieraException("El producto no tiene una tasa activa: edítalo antes de activarlo.");
        }
        p.setActivo(nuevoEstado);
        p = productoRepository.save(p);
        return toResponseDto(p, tasaActiva(p), parseSistemas(p.getSistemasPermitidos()), cargosActivos(p));
    }

    // ─── Validaciones ────────────────────────────────────────────────────────

    /** Devuelve los cobros indirectos normalizados; cualquier incumplimiento detiene el guardado. */
    private List<CargoConfiguracionDto> validar(ConfigurarCreditoRequestDto dto, String segmentoActual) {
        LocalDate hoy = LocalDate.now();
        if (dto.montoMin().signum() <= 0) {
            throw new NormativaFinancieraException("El monto mínimo debe ser mayor a 0.");
        }
        if (dto.montoMax().compareTo(dto.montoMin()) < 0) {
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "El monto máximo ($%.2f) no puede ser menor al monto mínimo ($%.2f).", dto.montoMax(), dto.montoMin()));
        }
        if (dto.plazoMinMeses() == null || dto.plazoMinMeses() <= 0) {
            throw new NormativaFinancieraException("El plazo mínimo debe ser de al menos 1 mes.");
        }
        if (dto.plazoMaxMeses() < dto.plazoMinMeses()) {
            throw new NormativaFinancieraException("El plazo máximo (" + dto.plazoMaxMeses()
                    + " meses) no puede ser menor al plazo mínimo (" + dto.plazoMinMeses() + " meses).");
        }
        if (dto.plazoMaxMeses() > 360) {
            throw new NormativaFinancieraException("El plazo máximo no puede superar 360 meses (30 años).");
        }
        String unidad = unidadPlazo(dto.unidadPlazo());
        if (unidad.equals("ANIOS") && (dto.plazoMinMeses() % 12 != 0 || dto.plazoMaxMeses() % 12 != 0)) {
            throw new NormativaFinancieraException("Si el cliente elige el plazo en años, los plazos deben ser años completos (múltiplos de 12 meses).");
        }
        if (dto.sistemasPermitidos() == null || dto.sistemasPermitidos().isEmpty()) {
            throw new NormativaFinancieraException("Selecciona al menos un sistema de amortización (francés o alemán).");
        }

        String segmento = normativaService.normalizarSegmentoKey(dto.segmentoBce());
        boolean mismoSegmento = segmento.equals(normativaService.normalizarSegmentoKey(segmentoActual));
        if (!normativaService.segmentoOfertable(segmento) && !mismoSegmento) {
            throw new NormativaFinancieraException("El segmento '" + segmento + "' ya no está vigente para productos nuevos.");
        }
        normativaService.validarTasa(segmento, dto.tasaInteres(), hoy);
        normativaService.validarMonto(segmento, dto.montoMax(), hoy);
        normativaService.validarPlazo(segmento, dto.plazoMaxMeses(), hoy);
        normativaService.validarDesgravamen(settings.entityType(), dto.tasaDesgravamenMensual(), hoy);
        return normativaService.validarCargos(dto.cargosIndirectos(), hoy);
    }

    // ─── Persistencia ────────────────────────────────────────────────────────

    private void aplicar(ProductoCreditoEntity producto, ConfigurarCreditoRequestDto dto) {
        String segmento = normativaService.normalizarSegmentoKey(dto.segmentoBce());
        producto.setTipoCredito(resolverTipoCredito(segmento, dto.nombre().trim()));
        producto.setNombre(dto.nombre().trim().replaceAll("\\s+", " "));
        producto.setDescripcion(dto.descripcion() != null && !dto.descripcion().isBlank() ? dto.descripcion().trim() : null);
        producto.setEntidad(settings.entityLabel());
        producto.setSegmentoBce(segmento);
        producto.setMontoMin(dto.montoMin());
        producto.setMontoMax(dto.montoMax());
        producto.setPlazoMinMeses(dto.plazoMinMeses());
        producto.setPlazoMaxMeses(dto.plazoMaxMeses());
        producto.setUnidadPlazo(unidadPlazo(dto.unidadPlazo()));
        producto.setTasaDesgravamenMensual(dto.tasaDesgravamenMensual());
        producto.setSistemasPermitidos(dto.sistemasPermitidos().stream().distinct().map(Enum::name)
                .collect(Collectors.joining(",")));
    }

    private void guardarTasa(TasaCreditoEntity tasa, ConfigurarCreditoRequestDto dto) {
        tasa.setNombre("Tasa activa efectiva - " + dto.nombre().trim());
        tasa.setValor(dto.tasaInteres());
        tasa.setSegmentoBce(normativaService.normalizarSegmentoKey(dto.segmentoBce()));
        tasa.setObservacion("Validada contra la tasa máxima vigente del BCE");
        tasa.setActivo(true);
        tasaCreditoRepository.save(tasa);
    }

    private List<CargoResponseDto> guardarCargos(ProductoCreditoEntity producto, List<CargoConfiguracionDto> cargos) {
        List<CargoResponseDto> guardados = new ArrayList<>();
        for (CargoConfiguracionDto dto : cargos) {
            CargoCreditoEntity cargo = new CargoCreditoEntity();
            cargo.setProducto(producto);
            cargo.setNombre(dto.nombre());
            cargo.setCategoria(dto.categoria());
            cargo.setTipoCargo(TipoCargo.valueOf(dto.tipoCargo()));
            cargo.setValor(dto.valor());
            cargo.setPeriodicidad(dto.periodicidad());
            cargo.setBaseCalculo(dto.baseCalculo());
            cargo.setNormaAplicable(dto.normaAplicable());
            cargo.setObligatorio(dto.obligatorio());
            cargo.setActivo(true);
            guardados.add(toCargoDto(cargoCreditoRepository.save(cargo)));
        }
        return guardados;
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

    private static String mapearCodigoSegmento(String segmentoBce) {
        String s = segmentoBce != null ? segmentoBce.toUpperCase(Locale.ROOT) : "";
        if (s.contains("CONSUMO")) return "CONSUMO";
        if (s.contains("MICRO")) return "MICROCREDITO";
        if (s.contains("VIVIENDA") || s.contains("INMOB")) return "VIVIENDA";
        if (s.contains("PROD") || s.contains("PYME") || s.contains("CORP")) return "PRODUCTIVO";
        if (s.contains("EDUC")) return "EDUCACION";
        return "CONSUMO";
    }

    private static String unidadPlazo(String unidad) {
        String value = unidad == null ? "MESES" : unidad.trim().toUpperCase(Locale.ROOT);
        if (!value.equals("MESES") && !value.equals("ANIOS")) {
            throw new NormativaFinancieraException("La unidad de plazo debe ser meses o años.");
        }
        return value;
    }

    // ─── Respuestas ──────────────────────────────────────────────────────────

    private static BigDecimal tasaActiva(ProductoCreditoEntity p) {
        return p.getTasas() == null ? null : p.getTasas().stream()
                .filter(TasaCreditoEntity::getActivo)
                .findFirst()
                .map(TasaCreditoEntity::getValor)
                .orElse(null);
    }

    private static List<CargoResponseDto> cargosActivos(ProductoCreditoEntity p) {
        return p.getCargos() == null ? List.of() : p.getCargos().stream()
                .filter(CargoCreditoEntity::getActivo)
                .map(CreditoConfiguracionService::toCargoDto)
                .toList();
    }

    private static CargoResponseDto toCargoDto(CargoCreditoEntity c) {
        return new CargoResponseDto(c.getId(), c.getNombre(), c.getTipoCargo().name(), c.getValor(),
                c.getPeriodicidad(), c.getBaseCalculo(), c.getNormaAplicable(), c.getObligatorio(), c.getCategoria());
    }

    private static List<SistemaAmortizacion> parseSistemas(String sistemasCsv) {
        if (sistemasCsv == null || sistemasCsv.isBlank()) {
            return List.of(SistemaAmortizacion.FRANCES, SistemaAmortizacion.ALEMAN);
        }
        List<SistemaAmortizacion> result = new ArrayList<>();
        for (String part : sistemasCsv.split(",")) {
            try {
                result.add(SistemaAmortizacion.valueOf(part.trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {
                // Valores antiguos no reconocidos se omiten.
            }
        }
        return result.isEmpty() ? List.of(SistemaAmortizacion.FRANCES) : result;
    }

    private static ConfigurarCreditoResponseDto toResponseDto(ProductoCreditoEntity p, BigDecimal tasaInteres,
                                                              List<SistemaAmortizacion> sistemas,
                                                              List<CargoResponseDto> cargos) {
        return new ConfigurarCreditoResponseDto(
                p.getId(),
                p.getNombre(),
                p.getEntidad(),
                p.getSegmentoBce(),
                p.getMontoMin(),
                p.getMontoMax(),
                p.getPlazoMinMeses(),
                p.getPlazoMaxMeses(),
                tasaInteres,
                p.getTasaDesgravamenMensual(),
                sistemas,
                p.getDescripcion(),
                p.getActivo(),
                p.getCreadoEn(),
                p.getUnidadPlazo() != null ? p.getUnidadPlazo() : "MESES",
                cargos
        );
    }
}
