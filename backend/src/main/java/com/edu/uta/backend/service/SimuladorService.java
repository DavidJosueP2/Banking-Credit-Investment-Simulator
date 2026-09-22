package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
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

/**
 * Servicio de cálculo de amortización con precisión bancaria.
 *
 * Soporta:
 * 1. Simulación simplificada para Cliente (POST /api/simulador/calcular) con matching de producto,
 *    frecuencia (mensual/anual) y seguro de desgravamen exacto sobre saldo remanente.
 * 2. Simulación técnica avanzada (POST /api/creditos/simular).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimuladorService {

    private static final MathContext MC = new MathContext(15, RoundingMode.HALF_UP);
    private static final int SCALE = 2;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    private final ProductoCreditoRepository productoRepository;

    // ─── 1. Flujo del Usuario Normal (Simulación Cliente) ─────────────────────

    @Transactional(readOnly = true)
    public SimulacionClienteResponseDto simularCliente(SimulacionClienteRequestDto req) {
        BigDecimal monto = req.monto();
        String frecuencia = req.frecuencia() != null ? req.frecuencia().toUpperCase().trim() : "MENSUAL";
        boolean esAnual = "ANUAL".equals(frecuencia);
        int plazoPeriodos = req.plazo();

        if (plazoPeriodos <= 0) {
            throw new NormativaFinancieraException("El plazo debe ser mayor a cero");
        }

        // Convertir a plazo en meses para buscar en el catálogo de productos
        int plazoEquivalenteMeses = esAnual ? plazoPeriodos * 12 : plazoPeriodos;

        // Buscar producto configurado que calce con la solicitud o validar productoId
        ProductoCreditoEntity producto;
        if (req.productoId() != null) {
            producto = productoRepository.findById(req.productoId())
                    .orElseThrow(() -> new NormativaFinancieraException("Producto de crédito no encontrado con ID: " + req.productoId()));

            if (req.entidad() != null && !req.entidad().isBlank()) {
                if (producto.getEntidad() != null && !producto.getEntidad().equalsIgnoreCase(req.entidad().trim())) {
                    throw new NormativaFinancieraException(String.format(
                            "El producto de crédito '%s' (ID %d) no pertenece a la entidad '%s'. Pertenece a '%s'.",
                            producto.getNombre(), req.productoId(), req.entidad().trim(), producto.getEntidad()
                    ));
                }
            }
        } else {
            producto = buscarProductoParaCliente(monto, plazoEquivalenteMeses, req.entidad());
        }

        // Validar que el sistema de amortización seleccionado esté permitido
        validarSistemaPermitido(producto, req.sistema());

        // Obtener la tasa de interés anual del producto
        BigDecimal tasaAnualPct = obtenerTasaAnual(producto);

        // Obtener la tasa de desgravamen configurada en el producto (porcentaje mensual)
        BigDecimal tasaDesgravamenMensualPct = producto.getTasaDesgravamenMensual() != null
                ? producto.getTasaDesgravamenMensual()
                : new BigDecimal("0.0600");

        // Calcular tasa periódica de interés
        // Si mensual: i_m = (1 + i_a)^(1/12) - 1
        // Si anual:   i_a = tasaAnualPct / 100
        BigDecimal tasaPeriodicaInteres = esAnual
                ? tasaAnualPct.divide(BigDecimal.valueOf(100), MC)
                : calcularTasaMensual(tasaAnualPct.divide(BigDecimal.valueOf(100), MC));

        // Calcular tasa periódica de desgravamen
        // El seguro de desgravamen se calcula aplicando la tasa sobre el saldo deudor vigente en cada período
        BigDecimal tasaPeriodicaDesgravamen = esAnual
                ? tasaDesgravamenMensualPct.multiply(BigDecimal.valueOf(12), MC).divide(BigDecimal.valueOf(100), MC)
                : tasaDesgravamenMensualPct.divide(BigDecimal.valueOf(100), MC);

        // Generar la tabla de amortización periódica
        return req.sistema() == SistemaAmortizacion.FRANCES
                ? calcularClienteFrances(producto, monto, plazoPeriodos, plazoEquivalenteMeses, frecuencia,
                tasaAnualPct, tasaDesgravamenMensualPct, tasaPeriodicaInteres, tasaPeriodicaDesgravamen)
                : calcularClienteAleman(producto, monto, plazoPeriodos, plazoEquivalenteMeses, frecuencia,
                tasaAnualPct, tasaDesgravamenMensualPct, tasaPeriodicaInteres, tasaPeriodicaDesgravamen);
    }

    private ProductoCreditoEntity buscarProductoParaCliente(BigDecimal monto, int plazoMeses, String entidad) {
        List<ProductoCreditoEntity> productos = productoRepository.findAllByActivoTrueOrderByIdDesc();

        if (productos.isEmpty()) {
            throw new NormativaFinancieraException("Actualmente no existen productos de crédito configurados en el sistema.");
        }

        boolean entidadEspecificada = entidad != null && !entidad.isBlank();

        if (entidadEspecificada) {
            String entidadNorm = entidad.trim();

            // 1. Coincidencia estricta y obligatoria en la entidad solicitada
            return productos.stream()
                    .filter(p -> p.getEntidad() != null && p.getEntidad().equalsIgnoreCase(entidadNorm))
                    .filter(p -> monto.compareTo(p.getMontoMin()) >= 0 && monto.compareTo(p.getMontoMax()) <= 0)
                    .filter(p -> plazoMeses >= p.getPlazoMinMeses() && plazoMeses <= p.getPlazoMaxMeses())
                    .findFirst()
                    .orElseThrow(() -> {
                        // Verificar si existe el producto en otra entidad para reportar violación de aislamiento
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

        // Búsqueda global si no se especificó entidad
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
            ProductoCreditoEntity producto, BigDecimal monto, int n, int plazoMeses, String frecuencia,
            BigDecimal tasaAnualPct, BigDecimal tasaDesgravamenMensualPct,
            BigDecimal i, BigDecimal iDesgravamen) {

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
        BigDecimal primeraCuota = null;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal capital = cuotaBase.subtract(interes).setScale(SCALE, RoundingMode.HALF_UP);

            // Ajuste en última cuota
            if (k == n) {
                capital = saldo.setScale(SCALE, RoundingMode.HALF_UP);
                interes = cuotaBase.subtract(capital).max(BigDecimal.ZERO);
            }

            // Seguro de Desgravamen: tasa periódica aplicada al saldo deudor vigente
            BigDecimal desgravamen = saldoInicial.multiply(iDesgravamen, MC).setScale(SCALE, RoundingMode.HALF_UP);
            // Cuota Total = Capital + Interés + Desgravamen
            BigDecimal cuotaTotal = capital.add(interes).add(desgravamen).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capital).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);

            totalCapital = totalCapital.add(capital);
            totalIntereses = totalIntereses.add(interes);
            totalDesgravamen = totalDesgravamen.add(desgravamen);

            if (k == 1) primeraCuota = cuotaTotal;

            tabla.add(new CuotaClienteDto(
                    k, saldoInicial, capital, interes, desgravamen, cuotaTotal, saldoFinal
            ));

            saldo = saldoFinal;
        }

        BigDecimal totalPagar = totalCapital.add(totalIntereses).add(totalDesgravamen)
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
                tabla
        );
    }

    // ─── 1.2 Cálculo Cliente: Sistema Alemán ───────────────────────────────────

    private SimulacionClienteResponseDto calcularClienteAleman(
            ProductoCreditoEntity producto, BigDecimal monto, int n, int plazoMeses, String frecuencia,
            BigDecimal tasaAnualPct, BigDecimal tasaDesgravamenMensualPct,
            BigDecimal i, BigDecimal iDesgravamen) {

        // Amortización constante = P / n
        BigDecimal amortizacion = monto.divide(BigDecimal.valueOf(n), MC)
                .setScale(SCALE, RoundingMode.HALF_UP);

        List<CuotaClienteDto> tabla = new ArrayList<>();
        BigDecimal saldo = monto;
        BigDecimal totalCapital = BigDecimal.ZERO;
        BigDecimal totalIntereses = BigDecimal.ZERO;
        BigDecimal totalDesgravamen = BigDecimal.ZERO;
        BigDecimal primeraCuota = null;

        for (int k = 1; k <= n; k++) {
            BigDecimal saldoInicial = saldo.setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal capital = (k == n) ? saldo.setScale(SCALE, RoundingMode.HALF_UP) : amortizacion;
            BigDecimal interes = saldo.multiply(i, MC).setScale(SCALE, RoundingMode.HALF_UP);

            // Seguro de Desgravamen: tasa periódica aplicada al saldo deudor vigente
            BigDecimal desgravamen = saldoInicial.multiply(iDesgravamen, MC).setScale(SCALE, RoundingMode.HALF_UP);
            // Cuota Total = Capital + Interés + Desgravamen
            BigDecimal cuotaTotal = capital.add(interes).add(desgravamen).setScale(SCALE, RoundingMode.HALF_UP);

            BigDecimal saldoFinal = saldo.subtract(capital).setScale(SCALE, RoundingMode.HALF_UP).max(BigDecimal.ZERO);

            totalCapital = totalCapital.add(capital);
            totalIntereses = totalIntereses.add(interes);
            totalDesgravamen = totalDesgravamen.add(desgravamen);

            if (k == 1) primeraCuota = cuotaTotal;

            tabla.add(new CuotaClienteDto(
                    k, saldoInicial, capital, interes, desgravamen, cuotaTotal, saldoFinal
            ));

            saldo = saldoFinal;
        }

        BigDecimal totalPagar = totalCapital.add(totalIntereses).add(totalDesgravamen)
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
                tabla
        );
    }

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
