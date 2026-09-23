package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.CargoCreditoEntity;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.SeguroCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.domain.enums.TipoCargo;
import com.edu.uta.backend.dto.EntidadCreditoDto;
import com.edu.uta.backend.dto.ProductoSimuladorDto;
import com.edu.uta.backend.dto.ProductoSimuladorDto.CargoIndirectoDto;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto.CuotaClienteDto;
import com.edu.uta.backend.dto.SimulacionRequestDto;
import com.edu.uta.backend.dto.SimulacionResponseDto;
import com.edu.uta.backend.dto.SimulacionResponseDto.CuotaDto;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Servicio de cálculo de amortización con precisión bancaria, control normativo BCE
 * e integración de cargos indirectos configurados.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimuladorService {

    private static final MathContext MC = new MathContext(15, RoundingMode.HALF_UP);
    private static final int SCALE = 2;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    private final ProductoCreditoRepository productoRepository;

    /**
     * Catálogo de productos de crédito configurados en base de datos para el simulador de clientes.
     */
    @Transactional(readOnly = true)
    public List<ProductoSimuladorDto> obtenerProductosDisponibles() {
        return productoRepository.findAllByActivoTrueOrderByOrdenAsc().stream()
                .map(p -> {
                    BigDecimal tasa = obtenerTasaAnual(p);
                    BigDecimal desgravamen = p.getTasaDesgravamenMensual() != null
                            ? p.getTasaDesgravamenMensual()
                            : new BigDecimal("0.0600");
                    String unidad = p.getUnidadPlazo() != null ? p.getUnidadPlazo().toUpperCase().trim() : "MESES";
                    boolean esAnios = "ANIOS".equals(unidad);
                    int plazoMin = esAnios ? Math.max(1, p.getPlazoMinMeses() / 12) : p.getPlazoMinMeses();
                    int plazoMax = esAnios ? Math.max(1, p.getPlazoMaxMeses() / 12) : p.getPlazoMaxMeses();
                    List<SistemaAmortizacion> sistemas = parseSistemas(p.getSistemasPermitidos());

                    List<CargoIndirectoDto> cargos = p.getCargos() != null
                            ? p.getCargos().stream()
                            .filter(c -> c.getActivo() == null || c.getActivo())
                            .map(c -> new CargoIndirectoDto(
                                    c.getId(), c.getNombre(),
                                    c.getTipoCargo() != null ? c.getTipoCargo().name() : "FIJO",
                                    c.getValor() != null ? c.getValor() : BigDecimal.ZERO,
                                    c.getPeriodicidad() != null ? c.getPeriodicidad() : "MENSUAL",
                                    c.getBaseCalculo() != null ? c.getBaseCalculo() : "SALDO_DEUDOR",
                                    c.getNormaAplicable(), c.getObligatorio()
                            )).toList()
                            : List.of();

                    return new ProductoSimuladorDto(
                            p.getId(),
                            p.getNombre(),
                            p.getDescripcion(),
                            tasa,
                            desgravamen,
                            p.getMontoMin(),
                            p.getMontoMax(),
                            plazoMin,
                            plazoMax,
                            unidad,
                            sistemas,
                            p.getSegmentoBce(),
                            cargos
                    );
                })
                .toList();
    }

    /**
     * Catálogo legado para retrocompatibilidad
     */
    @Transactional(readOnly = true)
    public List<EntidadCreditoDto> obtenerEntidadesDisponibles() {
        return productoRepository.findAllByActivoTrueOrderByOrdenAsc().stream()
                .map(p -> new EntidadCreditoDto(
                        p.getId(),
                        p.getNombre(),
                        p.getEntidad() != null ? p.getEntidad() : "Banco",
                        obtenerTasaAnual(p),
                        p.getTasaDesgravamenMensual() != null ? p.getTasaDesgravamenMensual() : new BigDecimal("0.0600"),
                        p.getMontoMin(),
                        p.getMontoMax(),
                        p.getPlazoMinMeses(),
                        p.getPlazoMaxMeses(),
                        p.getSistemasPermitidos()
                ))
                .toList();
    }

    // ─── 1. Flujo del Usuario Normal (Simulación Cliente) ─────────────────────

    @Transactional(readOnly = true)
    public SimulacionClienteResponseDto simularCliente(SimulacionClienteRequestDto req) {
        BigDecimal monto = req.monto();
        int plazoPeriodos = req.plazo();

        if (plazoPeriodos <= 0) {
            throw new NormativaFinancieraException("El plazo debe ser mayor a cero");
        }

        // 1. Resolver el producto por ID configurado o búsqueda
        ProductoCreditoEntity producto;
        Long idSeleccionado = req.resolverProductoId();

        if (idSeleccionado != null) {
            producto = productoRepository.findById(idSeleccionado)
                    .orElseThrow(() -> new NormativaFinancieraException("Producto de crédito no encontrado con ID: " + idSeleccionado));

            if (req.entidad() != null && !req.entidad().isBlank()) {
                if (producto.getEntidad() != null && !producto.getEntidad().equalsIgnoreCase(req.entidad().trim())) {
                    throw new NormativaFinancieraException(String.format(
                            "El producto de crédito '%s' (ID %d) no pertenece a la entidad '%s'. Pertenece a '%s'.",
                            producto.getNombre(), idSeleccionado, req.entidad().trim(), producto.getEntidad()
                    ));
                }
            }
        } else {
            String freqTemp = req.frecuencia() != null ? req.frecuencia().toUpperCase().trim() : "MENSUAL";
            int mesesTemp = "ANUAL".equals(freqTemp) ? plazoPeriodos * 12 : plazoPeriodos;
            producto = buscarProductoParaCliente(monto, mesesTemp, req.entidad());
        }

        // 2. Determinar unidad de plazo y frecuencia
        String unidadProducto = producto.getUnidadPlazo() != null ? producto.getUnidadPlazo().trim().toUpperCase() : "MESES";
        boolean esAnual = "ANIOS".equals(unidadProducto) || "ANUAL".equalsIgnoreCase(req.frecuencia());
        String frecuencia = esAnual ? "ANUAL" : "MENSUAL";
        int plazoEquivalenteMeses = esAnual ? plazoPeriodos * 12 : plazoPeriodos;

        // 3. Validar costo total del bien o servicio si se suministró
        BigDecimal costoTotal = req.costoTotal();
        if (costoTotal != null) {
            if (costoTotal.compareTo(BigDecimal.ZERO) <= 0) {
                throw new NormativaFinancieraException("El costo total del bien o servicio debe ser mayor a cero");
            }
            if (monto.compareTo(costoTotal) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El monto solicitado ($%.2f) no puede ser mayor que el costo total del bien o servicio ($%.2f).",
                        monto, costoTotal));
            }
        }

        // 4. Validar monto solicitado contra límites del producto
        if (monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new NormativaFinancieraException("El monto a financiar debe ser mayor a cero");
        }
        if (producto.getMontoMin() != null && monto.compareTo(producto.getMontoMin()) < 0) {
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "El monto solicitado ($%.2f) es inferior al monto mínimo permitido ($%.2f) para '%s'.",
                    monto, producto.getMontoMin(), producto.getNombre()));
        }
        if (producto.getMontoMax() != null && monto.compareTo(producto.getMontoMax()) > 0) {
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "El monto solicitado ($%.2f) excede el monto máximo permitido ($%.2f) para '%s'.",
                    monto, producto.getMontoMax(), producto.getNombre()));
        }

        // 5. Validar plazo permitido
        if (plazoEquivalenteMeses < producto.getPlazoMinMeses() || plazoEquivalenteMeses > producto.getPlazoMaxMeses()) {
            int minUnit = esAnual ? Math.max(1, producto.getPlazoMinMeses() / 12) : producto.getPlazoMinMeses();
            int maxUnit = esAnual ? Math.max(1, producto.getPlazoMaxMeses() / 12) : producto.getPlazoMaxMeses();
            String uName = esAnual ? "años" : "meses";
            throw new NormativaFinancieraException(String.format(
                    "El plazo ingresado (%d %s) está fuera del rango permitido (%d a %d %s) para '%s'.",
                    plazoPeriodos, uName, minUnit, maxUnit, uName, producto.getNombre()
            ));
        }

        // 6. Validar que el sistema de amortización seleccionado esté permitido
        validarSistemaPermitido(producto, req.sistema());

        // 7. Obtener la tasa de interés anual del producto desde la base de datos
        BigDecimal tasaAnualPct = obtenerTasaAnual(producto);

        // 8. Obtener la tasa de desgravamen configurada en el producto (porcentaje mensual)
        BigDecimal tasaDesgravamenMensualPct = producto.getTasaDesgravamenMensual() != null
                ? producto.getTasaDesgravamenMensual()
                : new BigDecimal("0.0600");

        // 9. Calcular tasa periódica de interés
        BigDecimal tasaPeriodicaInteres = esAnual
                ? tasaAnualPct.divide(BigDecimal.valueOf(100), MC)
                : calcularTasaMensual(tasaAnualPct.divide(BigDecimal.valueOf(100), MC));

        // 10. Calcular tasa periódica de desgravamen
        BigDecimal tasaPeriodicaDesgravamen = esAnual
                ? tasaDesgravamenMensualPct.multiply(BigDecimal.valueOf(12), MC).divide(BigDecimal.valueOf(100), MC)
                : tasaDesgravamenMensualPct.divide(BigDecimal.valueOf(100), MC);

        // 11. Generar la tabla de amortización periódica con desgravamen y cargos indirectos
        return req.sistema() == SistemaAmortizacion.FRANCES
                ? calcularClienteFrances(producto, monto, costoTotal, plazoPeriodos, plazoEquivalenteMeses, frecuencia,
                unidadProducto, tasaAnualPct, tasaDesgravamenMensualPct, tasaPeriodicaInteres, tasaPeriodicaDesgravamen, req.usuario())
                : calcularClienteAleman(producto, monto, costoTotal, plazoPeriodos, plazoEquivalenteMeses, frecuencia,
                unidadProducto, tasaAnualPct, tasaDesgravamenMensualPct, tasaPeriodicaInteres, tasaPeriodicaDesgravamen, req.usuario());
    }

    private ProductoCreditoEntity buscarProductoParaCliente(BigDecimal monto, int plazoMeses, String entidad) {
        List<ProductoCreditoEntity> productos = productoRepository.findAllByActivoTrueOrderByIdDesc();

        if (productos.isEmpty()) {
            throw new NormativaFinancieraException("Actualmente no existen productos de crédito configurados en el sistema.");
        }

        boolean entidadEspecificada = entidad != null && !entidad.isBlank();

        if (entidadEspecificada) {
            String entidadNorm = entidad.trim();

            return productos.stream()
                    .filter(p -> p.getEntidad() != null && p.getEntidad().equalsIgnoreCase(entidadNorm))
                    .filter(p -> monto.compareTo(p.getMontoMin()) >= 0 && monto.compareTo(p.getMontoMax()) <= 0)
                    .filter(p -> plazoMeses >= p.getPlazoMinMeses() && plazoMeses <= p.getPlazoMaxMeses())
                    .findFirst()
                    .orElseThrow(() -> {
                        boolean existeEnOtraEntidad = productos.stream()
                                .anyMatch(p -> monto.compareTo(p.getMontoMin()) >= 0 && monto.compareTo(p.getMontoMax()) <= 0
                                        && plazoMeses >= p.getPlazoMinMeses() && plazoMeses <= p.getPlazoMaxMeses());

                        if (existeEnOtraEntidad) {
                            throw new NormativaFinancieraException(String.format(
                                    "El producto de crédito solicitado no pertenece a la entidad '%s' o no está habilitado para esta institución.",
                                    entidadNorm
                            ));
                        }

                        List<ProductoCreditoEntity> prodsEntidad = productos.stream()
                                .filter(p -> p.getEntidad() != null && p.getEntidad().equalsIgnoreCase(entidadNorm))
                                .toList();

                        if (prodsEntidad.isEmpty()) {
                            throw new NormativaFinancieraException(String.format(
                                    "No existen productos de crédito configurados para la entidad '%s'.",
                                    entidadNorm
                            ));
                        }

                        BigDecimal min = prodsEntidad.stream().map(ProductoCreditoEntity::getMontoMin).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
                        BigDecimal max = prodsEntidad.stream().map(ProductoCreditoEntity::getMontoMax).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
                        int minPlazo = prodsEntidad.stream().mapToInt(ProductoCreditoEntity::getPlazoMinMeses).min().orElse(1);
                        int maxPlazo = prodsEntidad.stream().mapToInt(ProductoCreditoEntity::getPlazoMaxMeses).max().orElse(360);

                        return new NormativaFinancieraException(String.format(
                                "No se encontró un producto disponible en '%s' para un monto de $%.2f y plazo de %d meses. " +
                                "Rangos disponibles en '%s': Monto de $%.2f a $%.2f, Plazo de %d a %d meses.",
                                entidadNorm, monto, plazoMeses, entidadNorm, min, max, minPlazo, maxPlazo
                        ));
                    });
        }

        return productos.stream()
                .filter(p -> monto.compareTo(p.getMontoMin()) >= 0 && monto.compareTo(p.getMontoMax()) <= 0)
                .filter(p -> plazoMeses >= p.getPlazoMinMeses() && plazoMeses <= p.getPlazoMaxMeses())
                .findFirst()
                .orElseThrow(() -> {
                    BigDecimal minGlobal = productos.stream().map(ProductoCreditoEntity::getMontoMin).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
                    BigDecimal maxGlobal = productos.stream().map(ProductoCreditoEntity::getMontoMax).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
                    int minPlazo = productos.stream().mapToInt(ProductoCreditoEntity::getPlazoMinMeses).min().orElse(1);
                    int maxPlazo = productos.stream().mapToInt(ProductoCreditoEntity::getPlazoMaxMeses).max().orElse(360);

                    return new NormativaFinancieraException(String.format(
                            "No se encontró un producto disponible para un monto de $%.2f y plazo de %d meses. " +
                            "Rangos disponibles en la institución: Monto de $%.2f a $%.2f, Plazo de %d a %d meses.",
                            monto, plazoMeses, minGlobal, maxGlobal, minPlazo, maxPlazo
                    ));
                });
    }

    private void validarSistemaPermitido(ProductoCreditoEntity producto, SistemaAmortizacion sistema) {
        String permitidos = producto.getSistemasPermitidos();
        if (permitidos != null && !permitidos.isBlank()) {
            boolean admitido = permitidos.toUpperCase().contains(sistema.name());
            if (!admitido) {
                throw new NormativaFinancieraException(String.format(
                        "El sistema de amortización %s no está habilitado para el producto '%s' (sistemas admitidos: %s).",
                        sistema, producto.getNombre(), permitidos
                ));
            }
        }
    }

    private BigDecimal obtenerTasaAnual(ProductoCreditoEntity producto) {
        if (producto.getTasas() != null && !producto.getTasas().isEmpty()) {
            return producto.getTasas().stream()
                    .filter(TasaCreditoEntity::getActivo)
                    .findFirst()
                    .map(TasaCreditoEntity::getValor)
                    .orElse(new BigDecimal("15.50"));
        }
        return new BigDecimal("15.50");
    }

    // ─── 1.1 Cálculo Cliente: Sistema Francés ──────────────────────────────────

    private SimulacionClienteResponseDto calcularClienteFrances(
            ProductoCreditoEntity producto, BigDecimal monto, BigDecimal costoTotal,
            int n, int plazoMeses, String frecuencia, String unidadPlazo,
            BigDecimal tasaAnualPct, BigDecimal tasaDesgravamenMensualPct,
            BigDecimal i, BigDecimal iDesgravamen, String usuario) {

        // C_base = P * [i * (1+i)^n] / [(1+i)^n - 1]
        BigDecimal unoPlusI = BigDecimal.ONE.add(i, MC);
        BigDecimal potencia = unoPlusI.pow(n, MC);
        BigDecimal numerador = i.multiply(potencia, MC);
        BigDecimal denominador = potencia.subtract(BigDecimal.ONE, MC);
        BigDecimal cuotaBase = monto.multiply(numerador.divide(denominador, MC), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaClienteDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalCapital = BigDecimal.ZERO;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalDesgravamen = BigDecimal.ZERO;
        BigDecimal totalCargosIndirectos = BigDecimal.ZERO;
        BigDecimal primeraCuota = null;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal capital = cuotaBase.subtract(interes).setScale(SCALE, RoundingMode.HALF_UP);

            // Ajuste en última cuota para cuadre exacto de saldo
            if (k == n) {
                capital = saldo.setScale(SCALE, RoundingMode.HALF_UP);
                interes = cuotaBase.subtract(capital).max(BigDecimal.ZERO);
            }

            // Seguro de Desgravamen: tasa periódica aplicada al saldo deudor vigente
            BigDecimal desgravamen = saldoInicial.multiply(iDesgravamen, MC).setScale(SCALE, RoundingMode.HALF_UP);

            // Cargos Indirectos regulados del período
            BigDecimal cargosIndirectos = calcularCargosPeriodo(producto, saldoInicial, monto, k, n);

            // Cuota Total = Capital + Interés + Desgravamen + Cargos Indirectos
            BigDecimal cuotaTotal = capital.add(interes).add(desgravamen).add(cargosIndirectos).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capital).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);

            totalCapital = totalCapital.add(capital);
            totalIntereses = totalIntereses.add(interes);
            totalDesgravamen = totalDesgravamen.add(desgravamen);
            totalCargosIndirectos = totalCargosIndirectos.add(cargosIndirectos);

            if (k == 1) primeraCuota = cuotaTotal;

            tabla.add(new CuotaClienteDto(
                    k, saldoInicial, capital, interes, desgravamen, cargosIndirectos, cuotaTotal, saldoFinal
            ));

            saldo = saldoFinal;
        }

        BigDecimal totalPagar = totalCapital.add(totalIntereses).add(totalDesgravamen).add(totalCargosIndirectos)
                .setScale(SCALE, RoundingMode.HALF_UP);

        return new SimulacionClienteResponseDto(
                producto.getId(),
                producto.getNombre(),
                producto.getEntidad() != null ? producto.getEntidad() : "Banco",
                producto.getSegmentoBce() != null ? producto.getSegmentoBce() : "Consumo Prioritario",
                monto,
                frecuencia,
                plazoMeses,
                n,
                tasaAnualPct,
                tasaDesgravamenMensualPct,
                SistemaAmortizacion.FRANCES,
                primeraCuota != null ? primeraCuota : BigDecimal.ZERO,
                totalCapital,
                totalIntereses,
                totalDesgravamen,
                totalPagar,
                tabla,
                usuario,
                costoTotal,
                unidadPlazo,
                totalCargosIndirectos
        );
    }

    // ─── 1.2 Cálculo Cliente: Sistema Alemán ───────────────────────────────────

    private SimulacionClienteResponseDto calcularClienteAleman(
            ProductoCreditoEntity producto, BigDecimal monto, BigDecimal costoTotal,
            int n, int plazoMeses, String frecuencia, String unidadPlazo,
            BigDecimal tasaAnualPct, BigDecimal tasaDesgravamenMensualPct,
            BigDecimal i, BigDecimal iDesgravamen, String usuario) {

        // Amortización constante = P / n
        BigDecimal amortizacion = monto.divide(BigDecimal.valueOf(n), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaClienteDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalCapital = BigDecimal.ZERO;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalDesgravamen = BigDecimal.ZERO;
        BigDecimal totalCargosIndirectos = BigDecimal.ZERO;
        BigDecimal primeraCuota = null;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal capital = (k == n) ? saldo.setScale(SCALE, RoundingMode.HALF_UP) : amortizacion;
            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);

            // Seguro de Desgravamen: tasa periódica aplicada al saldo deudor vigente
            BigDecimal desgravamen = saldoInicial.multiply(iDesgravamen, MC).setScale(SCALE, RoundingMode.HALF_UP);

            // Cargos Indirectos regulados del período
            BigDecimal cargosIndirectos = calcularCargosPeriodo(producto, saldoInicial, monto, k, n);

            // Cuota Total = Capital + Interés + Desgravamen + Cargos Indirectos
            BigDecimal cuotaTotal = capital.add(interes).add(desgravamen).add(cargosIndirectos).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capital).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);

            totalCapital = totalCapital.add(capital);
            totalIntereses = totalIntereses.add(interes);
            totalDesgravamen = totalDesgravamen.add(desgravamen);
            totalCargosIndirectos = totalCargosIndirectos.add(cargosIndirectos);

            if (k == 1) primeraCuota = cuotaTotal;

            tabla.add(new CuotaClienteDto(
                    k, saldoInicial, capital, interes, desgravamen, cargosIndirectos, cuotaTotal, saldoFinal
            ));

            saldo = saldoFinal;
        }

        BigDecimal totalPagar = totalCapital.add(totalIntereses).add(totalDesgravamen).add(totalCargosIndirectos)
                .setScale(SCALE, RoundingMode.HALF_UP);

        return new SimulacionClienteResponseDto(
                producto.getId(),
                producto.getNombre(),
                producto.getEntidad() != null ? producto.getEntidad() : "Banco",
                producto.getSegmentoBce() != null ? producto.getSegmentoBce() : "Consumo Prioritario",
                monto,
                frecuencia,
                plazoMeses,
                n,
                tasaAnualPct,
                tasaDesgravamenMensualPct,
                SistemaAmortizacion.ALEMAN,
                primeraCuota != null ? primeraCuota : BigDecimal.ZERO,
                totalCapital,
                totalIntereses,
                totalDesgravamen,
                totalPagar,
                tabla,
                usuario,
                costoTotal,
                unidadPlazo,
                totalCargosIndirectos
        );
    }

    /**
     * Calcula los cargos indirectos y seguros adicionales correspondientes al período k.
     */
    private BigDecimal calcularCargosPeriodo(ProductoCreditoEntity producto, BigDecimal saldoInicial, BigDecimal monto, int k, int n) {
        BigDecimal totalPeriodo = BigDecimal.ZERO;

        // 1. Cargos indirectos de la entidad
        if (producto.getCargos() != null && !producto.getCargos().isEmpty()) {
            for (CargoCreditoEntity c : producto.getCargos()) {
                if (c.getActivo() != null && !c.getActivo()) continue;

                String peri = c.getPeriodicidad() != null ? c.getPeriodicidad().toUpperCase().trim() : "MENSUAL";
                String base = c.getBaseCalculo() != null ? c.getBaseCalculo().toUpperCase().trim() : "SALDO_DEUDOR";
                TipoCargo tipo = c.getTipoCargo() != null ? c.getTipoCargo() : TipoCargo.FIJO;
                BigDecimal val = c.getValor() != null ? c.getValor() : BigDecimal.ZERO;

                if ("UNICO".equals(peri)) {
                    // Cargo único en la primera cuota
                    if (k == 1) {
                        if (tipo == TipoCargo.PORCENTAJE) {
                            BigDecimal cMonto = monto.multiply(val.divide(BigDecimal.valueOf(100), MC), MC);
                            totalPeriodo = totalPeriodo.add(cMonto);
                        } else {
                            totalPeriodo = totalPeriodo.add(val);
                        }
                    }
                } else {
                    // Cargo periódico (cada cuota)
                    if (tipo == TipoCargo.PORCENTAJE) {
                        if ("MONTO_SOLICITADO".equals(base)) {
                            BigDecimal cMonto = monto.multiply(val.divide(BigDecimal.valueOf(100), MC), MC);
                            totalPeriodo = totalPeriodo.add(cMonto);
                        } else {
                            // Porcentaje sobre saldo deudor
                            BigDecimal cSaldo = saldoInicial.multiply(val.divide(BigDecimal.valueOf(100), MC), MC);
                            totalPeriodo = totalPeriodo.add(cSaldo);
                        }
                    } else {
                        totalPeriodo = totalPeriodo.add(val);
                    }
                }
            }
        }

        // 2. Seguros adicionales requeridos (ej. Incendio / Terremoto)
        if (producto.getSeguros() != null && !producto.getSeguros().isEmpty()) {
            for (SeguroCreditoEntity s : producto.getSeguros()) {
                if (s.getActivo() != null && !s.getActivo()) continue;
                if (s.getTipoSeguro() == com.edu.uta.backend.domain.enums.TipoSeguro.DESGRAVAMEN) {
                    continue; // El desgravamen se computa en su propia columna independiente
                }
                BigDecimal pct = s.getValorPorcentaje() != null ? s.getValorPorcentaje() : BigDecimal.ZERO;
                if (pct.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal seguroPeriodo = saldoInicial.multiply(pct.divide(BigDecimal.valueOf(100), MC), MC);
                    totalPeriodo = totalPeriodo.add(seguroPeriodo);
                }
            }
        }

        return totalPeriodo.setScale(SCALE, RoundingMode.HALF_UP);
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

    // ─── Simulación Técnica / Avanzada Legada ──────────────────────────────────

    public SimulacionResponseDto simular(SimulacionRequestDto req) {
        if (req.productoId() != null) {
            ProductoCreditoEntity prod = productoRepository.findById(req.productoId())
                    .orElseThrow(() -> new NormativaFinancieraException("Producto de crédito no encontrado con ID: " + req.productoId()));

            if (req.entidad() != null && !req.entidad().isBlank()) {
                if (prod.getEntidad() != null && !prod.getEntidad().equalsIgnoreCase(req.entidad().trim())) {
                    throw new NormativaFinancieraException(String.format(
                            "El producto de crédito '%s' (ID %d) pertenece a la entidad '%s' y no a la entidad solicitada '%s'.",
                            prod.getNombre(), req.productoId(), prod.getEntidad(), req.entidad().trim()
                    ));
                }
            }
        }

        BigDecimal monto = req.monto();
        int n = req.plazoMeses();

        BigDecimal tasaAnual = req.tasaEfectiva().divide(BigDecimal.valueOf(100), MC);
        BigDecimal tasaMensual = calcularTasaMensual(tasaAnual);

        BigDecimal seguroPct = req.seguroDesgravamenPct() != null
                ? req.seguroDesgravamenPct().divide(BigDecimal.valueOf(100), MC)
                .divide(BigDecimal.valueOf(12), MC)
                : BigDecimal.ZERO;

        LocalDate fechaDesembolso = req.fechaDesembolso() != null && !req.fechaDesembolso().isBlank()
                ? LocalDate.parse(req.fechaDesembolso(), ISO)
                : LocalDate.now();

        return req.sistema() == SistemaAmortizacion.FRANCES
                ? simularFrances(monto, n, tasaMensual, seguroPct, fechaDesembolso, req)
                : simularAleman(monto, n, tasaMensual, seguroPct, fechaDesembolso, req);
    }

    private SimulacionResponseDto simularFrances(BigDecimal monto, int n,
                                                  BigDecimal i, BigDecimal seguroPct,
                                                  LocalDate fechaDesembolso,
                                                  SimulacionRequestDto req) {
        BigDecimal unoPlusI = BigDecimal.ONE.add(i, MC);
        BigDecimal potencia = unoPlusI.pow(n, MC);
        BigDecimal numerador = i.multiply(potencia, MC);
        BigDecimal denominador = potencia.subtract(BigDecimal.ONE, MC);
        BigDecimal cuotaBase = monto.multiply(numerador.divide(denominador, MC), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalSeguros = BigDecimal.ZERO;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal capital = cuotaBase.subtract(interes).setScale(SCALE, RoundingMode.HALF_UP);

            if (k == n) {
                capital = saldo.setScale(SCALE, RoundingMode.HALF_UP);
                interes = cuotaBase.subtract(capital).max(BigDecimal.ZERO);
            }

            BigDecimal seguro = saldoInicial.multiply(seguroPct, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal cuotaTotal = cuotaBase.add(seguro).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capital).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);
            totalIntereses = totalIntereses.add(interes);
            totalSeguros = totalSeguros.add(seguro);

            String fechaVencimiento = fechaDesembolso.plusMonths(k).format(ISO);

            tabla.add(new CuotaDto(k, fechaVencimiento, saldoInicial,
                    capital, interes, seguro, BigDecimal.ZERO,
                    cuotaTotal, saldoFinal.max(BigDecimal.ZERO)));
            saldo = saldoFinal.max(BigDecimal.ZERO);
        }

        BigDecimal totalPagar = cuotaBase.multiply(BigDecimal.valueOf(n))
                .add(totalSeguros)
                .setScale(SCALE, RoundingMode.HALF_UP);

        return new SimulacionResponseDto(
                SistemaAmortizacion.FRANCES, monto, n,
                req.tasaEfectiva(),
                i.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                cuotaBase.add(tabla.isEmpty() ? BigDecimal.ZERO : tabla.get(0).seguro()),
                totalIntereses.setScale(SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO,
                totalSeguros.setScale(SCALE, RoundingMode.HALF_UP),
                totalPagar,
                fechaDesembolso.format(ISO),
                req.seguroDesgravamenPct(),
                tabla
        );
    }

    private SimulacionResponseDto simularAleman(BigDecimal monto, int n,
                                                 BigDecimal i, BigDecimal seguroPct,
                                                 LocalDate fechaDesembolso,
                                                 SimulacionRequestDto req) {
        BigDecimal amortizacion = monto.divide(BigDecimal.valueOf(n), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalSeguros = BigDecimal.ZERO;
        BigDecimal primeraCuota = null;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal capitalMes = (k == n) ? saldo.setScale(SCALE, RoundingMode.HALF_UP) : amortizacion;
            BigDecimal seguro = saldoInicial.multiply(seguroPct, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal cuotaTotal = capitalMes.add(interes).add(seguro).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capitalMes).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);
            totalIntereses = totalIntereses.add(interes);
            totalSeguros = totalSeguros.add(seguro);

            if (k == 1) primeraCuota = cuotaTotal;

            String fechaVencimiento = fechaDesembolso.plusMonths(k).format(ISO);

            tabla.add(new CuotaDto(k, fechaVencimiento, saldoInicial,
                    capitalMes, interes, seguro, BigDecimal.ZERO,
                    cuotaTotal, saldoFinal));
            saldo = saldoFinal;
        }

        BigDecimal totalPagar = monto.add(totalIntereses).add(totalSeguros)
                .setScale(SCALE, RoundingMode.HALF_UP);

        return new SimulacionResponseDto(
                SistemaAmortizacion.ALEMAN, monto, n,
                req.tasaEfectiva(),
                i.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                primeraCuota != null ? primeraCuota : BigDecimal.ZERO,
                totalIntereses.setScale(SCALE, RoundingMode.HALF_UP),
                BigDecimal.ZERO,
                totalSeguros.setScale(SCALE, RoundingMode.HALF_UP),
                totalPagar,
                fechaDesembolso.format(ISO),
                req.seguroDesgravamenPct(),
                tabla
        );
    }

    /**
     * Convierte tasa efectiva anual a tasa periódica mensual equivalente.
     * i_m = (1 + i_a)^(1/12) - 1
     */
    private BigDecimal calcularTasaMensual(BigDecimal tasaAnual) {
        double ta = tasaAnual.doubleValue();
        double tm = Math.pow(1.0 + ta, 1.0 / 12.0) - 1.0;
        return BigDecimal.valueOf(tm).round(MC);
    }
}
