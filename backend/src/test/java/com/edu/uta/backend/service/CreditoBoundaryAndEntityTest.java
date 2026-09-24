package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.CargoCreditoEntity;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.domain.enums.TipoCargo;
import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto;
import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto.CargoConfiguracionDto;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.repository.CargoCreditoRepository;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.ReglaNormativaRepository;
import com.edu.uta.backend.repository.SegmentoCreditoRepository;
import com.edu.uta.backend.repository.TasaCreditoRepository;
import com.edu.uta.backend.repository.TipoCreditoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditoBoundaryAndEntityTest {

    @Mock
    private ProductoCreditoRepository productoRepository;

    @Mock
    private TasaCreditoRepository tasaCreditoRepository;

    @Mock
    private TipoCreditoRepository tipoCreditoRepository;

    @Mock
    private SegmentoCreditoRepository segmentoRepository;

    @Mock
    private CargoCreditoRepository cargoCreditoRepository;

    @Mock
    private ReglaNormativaRepository reglaNormativaRepository;

    private NormativaRegulatoriaService normativaService;
    private CreditoConfiguracionService configuracionService;
    private SimuladorService simuladorService;

    @BeforeEach
    void setUp() {
        normativaService = new NormativaRegulatoriaService(reglaNormativaRepository);
        configuracionService = new CreditoConfiguracionService(
                productoRepository, tipoCreditoRepository, segmentoRepository,
                tasaCreditoRepository, cargoCreditoRepository, normativaService
        );
        simuladorService = new SimuladorService(productoRepository);
    }

    @Test
    @DisplayName("CP-02 / Caso 1: Microcrédito Minorista con tasa 28.24% excede el tope legal del BCE (28.23%) y debe lanzar excepción")
    void testMicrocreditoTasaExcedida() {
        ConfigurarCreditoRequestDto req = new ConfigurarCreditoRequestDto(
                "Microcrédito Minorista Test",
                "Cooperativa",
                "MICROCREDITO_MINORISTA",
                new BigDecimal("500.00"),
                new BigDecimal("3000.00"),
                3,
                36,
                new BigDecimal("28.24"), // Excede 28.23%
                new BigDecimal("0.0800"),
                List.of(SistemaAmortizacion.FRANCES),
                "Prueba BVA límite superior"
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> configuracionService.configurar(req)
        );

        assertTrue(ex.getMessage().contains("28.24%"));
        assertTrue(ex.getMessage().contains("28.23%"));
    }

    @Test
    @DisplayName("CP-02: Microcrédito Minorista con tasa exactamente 28.23% cumple el tope legal del BCE")
    void testMicrocreditoTasaExactaEnLimite() {
        ConfigurarCreditoRequestDto req = new ConfigurarCreditoRequestDto(
                "Microcrédito Minorista Test",
                "Cooperativa",
                "MICROCREDITO_MINORISTA",
                new BigDecimal("500.00"),
                new BigDecimal("3000.00"),
                3,
                36,
                new BigDecimal("28.23"), // Justo en el límite
                new BigDecimal("0.0800"),
                List.of(SistemaAmortizacion.FRANCES),
                "Prueba BVA valor límite"
        );

        when(segmentoRepository.findByCodigo(any())).thenReturn(Optional.empty());
        when(segmentoRepository.findAll()).thenReturn(List.of());
        when(segmentoRepository.save(any())).thenAnswer(inv -> {
            com.edu.uta.backend.domain.entity.SegmentoCreditoEntity s = inv.getArgument(0);
            s.setId(1L);
            return s;
        });
        when(tipoCreditoRepository.findAllBySegmentoIdAndActivoTrueOrderByOrdenAsc(any())).thenReturn(List.of());
        when(tipoCreditoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> configuracionService.configurar(req));
    }

    @Test
    @DisplayName("Caso 2: Monto configurado en Consumo Prioritario ($35,000) excede el tope legal BCE ($30,000) y debe ser rechazado")
    void testMontoExcedeTopeLegalRechazado() {
        ConfigurarCreditoRequestDto req = new ConfigurarCreditoRequestDto(
                "Consumo Excedido",
                "Banco",
                "CONSUMO_PRIORITARIO",
                new BigDecimal("1000.00"),
                new BigDecimal("35000.00"), // Excede $30,000
                12,
                60,
                new BigDecimal("15.00"),
                new BigDecimal("0.0500"),
                List.of(SistemaAmortizacion.FRANCES),
                "Prueba monto excede tope legal"
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> configuracionService.configurar(req)
        );

        assertTrue(ex.getMessage().contains("35000") || ex.getMessage().contains("35,000"));
        assertTrue(ex.getMessage().contains("30000") || ex.getMessage().contains("30,000"));
    }

    @Test
    @DisplayName("Caso 3: Desgravamen para Banco (0.0700%) supera el tope de la Superintendencia de Bancos (0.0650%) y debe ser rechazado")
    void testDesgravamenBancoExcedeTopeLegalRechazado() {
        ConfigurarCreditoRequestDto req = new ConfigurarCreditoRequestDto(
                "Consumo Banco Seguro Alto",
                "Banco",
                "CONSUMO_PRIORITARIO",
                new BigDecimal("1000.00"),
                new BigDecimal("20000.00"),
                12,
                60,
                new BigDecimal("15.00"),
                new BigDecimal("0.0700"), // Excede 0.0650% para bancos
                List.of(SistemaAmortizacion.FRANCES),
                "Prueba desgravamen excede tope SB"
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> configuracionService.configurar(req)
        );

        assertTrue(ex.getMessage().contains("0.0650%"));
    }

    @Test
    @DisplayName("Caso 4: Cargo indirecto regulado (Cobranza/Notarial de $150) excede el tope JPRFM ($100) y debe ser rechazado")
    void testCargoIndirectoReguladoExcedeTopeRechazado() {
        CargoConfiguracionDto cargoExcesivo = new CargoConfiguracionDto(
                "Gastos de Cobranza y Notaría",
                "FIJO",
                new BigDecimal("150.00"), // Excede $100.00
                "UNICO",
                "FIJO",
                "Resolución JPRFM",
                true
        );

        ConfigurarCreditoRequestDto req = new ConfigurarCreditoRequestDto(
                "Consumo Con Cargo Excesivo",
                "Banco",
                "CONSUMO_PRIORITARIO",
                new BigDecimal("1000.00"),
                new BigDecimal("20000.00"),
                12,
                60,
                new BigDecimal("15.00"),
                new BigDecimal("0.0500"),
                List.of(SistemaAmortizacion.FRANCES),
                "Prueba cargo indirecto regulado",
                "MESES",
                List.of(cargoExcesivo)
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> configuracionService.configurar(req)
        );

        assertTrue(ex.getMessage().contains("Gastos de Cobranza y Notaría"));
        assertTrue(ex.getMessage().contains("100.00"));
    }

    @Test
    @DisplayName("CP-03: Cálculo de Cuota 1 con Desgravamen exacto del 0.05% sobre saldo inicial")
    void testDesgravamenCuotaUnoExacta() {
        ProductoCreditoEntity prod = new ProductoCreditoEntity();
        prod.setId(10L);
        prod.setNombre("Crédito Consumo Banco");
        prod.setEntidad("Banco");
        prod.setSegmentoBce("CONSUMO_PRIORITARIO");
        prod.setMontoMin(new BigDecimal("500.00"));
        prod.setMontoMax(new BigDecimal("30000.00"));
        prod.setPlazoMinMeses(12);
        prod.setPlazoMaxMeses(60);
        prod.setTasaDesgravamenMensual(new BigDecimal("0.0500"));
        prod.setSistemasPermitidos("FRANCES,ALEMAN");
        prod.setActivo(true);

        TasaCreditoEntity tasa = new TasaCreditoEntity();
        tasa.setActivo(true);
        tasa.setValor(new BigDecimal("14.00"));
        prod.setTasas(List.of(tasa));

        when(productoRepository.findAllByActivoTrueOrderByIdDesc()).thenReturn(List.of(prod));

        SimulacionClienteRequestDto req = new SimulacionClienteRequestDto(
                new BigDecimal("10000.00"),
                "MENSUAL",
                12,
                SistemaAmortizacion.FRANCES,
                "Banco",
                null
        );

        SimulacionClienteResponseDto resp = simuladorService.simularCliente(req);
        assertNotNull(resp);

        // Cuota 1: saldo deudor inicial = 10000.00
        // Desgravamen = 10000 * (0.05 / 100) = 5.00
        var cuota1 = resp.tablaCuotas().get(0);
        assertEquals(0, new BigDecimal("10000.00").compareTo(cuota1.saldoInicial()));
        assertEquals(0, new BigDecimal("5.00").compareTo(cuota1.desgravamen()));
        assertEquals(0, cuota1.capital().add(cuota1.interes()).add(cuota1.desgravamen()).compareTo(cuota1.cuotaTotal()));
    }

    @Test
    @DisplayName("CP-04: Aislamiento de Entidad - Rechaza simulación si producto pertenece a Banco y se solicita Cooperativa")
    void testAislamientoEntidadRechazaCruzado() {
        ProductoCreditoEntity prodBanco = new ProductoCreditoEntity();
        prodBanco.setId(1L);
        prodBanco.setNombre("Vivienda Banco");
        prodBanco.setEntidad("Banco");
        prodBanco.setMontoMin(new BigDecimal("40000.00"));
        prodBanco.setMontoMax(new BigDecimal("200000.00"));
        prodBanco.setPlazoMinMeses(120);
        prodBanco.setPlazoMaxMeses(240);
        prodBanco.setActivo(true);

        when(productoRepository.findAllByActivoTrueOrderByIdDesc()).thenReturn(List.of(prodBanco));

        SimulacionClienteRequestDto req = new SimulacionClienteRequestDto(
                new BigDecimal("50000.00"),
                "MENSUAL",
                120,
                SistemaAmortizacion.FRANCES,
                "Cooperativa",
                null
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> simuladorService.simularCliente(req)
        );

        assertTrue(ex.getMessage().contains("no pertenece a la entidad 'Cooperativa'"));
    }

    @Test
    @DisplayName("Caso 7: Simulación rechazada si el monto a prestar supera el costo total del bien/servicio")
    void testMontoExcedeCostoTotalBienRechazado() {
        ProductoCreditoEntity prod = new ProductoCreditoEntity();
        prod.setId(1L);
        prod.setNombre("Crédito Consumo");
        prod.setMontoMin(new BigDecimal("500.00"));
        prod.setMontoMax(new BigDecimal("30000.00"));
        prod.setPlazoMinMeses(6);
        prod.setPlazoMaxMeses(60);
        prod.setActivo(true);

        when(productoRepository.findById(1L)).thenReturn(Optional.of(prod));

        // Solicitud: costo del bien = $10,000, pero usuario pide prestar $12,000
        SimulacionClienteRequestDto req = new SimulacionClienteRequestDto(
                new BigDecimal("12000.00"), // monto solicitado
                "MENSUAL",
                24,
                SistemaAmortizacion.FRANCES,
                null,
                1L,
                1L,
                null,
                new BigDecimal("10000.00"), // costo total
                1L
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> simuladorService.simularCliente(req)
        );

        assertTrue(ex.getMessage().contains("no puede ser mayor que el costo total"));
    }

    @Test
    @DisplayName("Caso 6: Simulación con cargos indirectos - La cuota total incluye capital + interés + desgravamen + cargo indirecto")
    void testSimulacionConCargosIndirectosYTablaOchoColumnas() {
        ProductoCreditoEntity prod = new ProductoCreditoEntity();
        prod.setId(2L);
        prod.setNombre("Crédito con Cargos");
        prod.setMontoMin(new BigDecimal("1000.00"));
        prod.setMontoMax(new BigDecimal("30000.00"));
        prod.setPlazoMinMeses(6);
        prod.setPlazoMaxMeses(60);
        prod.setTasaDesgravamenMensual(new BigDecimal("0.0500"));
        prod.setSistemasPermitidos("FRANCES");
        prod.setActivo(true);

        TasaCreditoEntity tasa = new TasaCreditoEntity();
        tasa.setActivo(true);
        tasa.setValor(new BigDecimal("12.00"));
        prod.setTasas(List.of(tasa));

        // Cargo indirecto fijo mensual de $5.00
        CargoCreditoEntity cargoFijo = new CargoCreditoEntity();
        cargoFijo.setNombre("Mantenimiento y Notificaciones");
        cargoFijo.setTipoCargo(TipoCargo.FIJO);
        cargoFijo.setValor(new BigDecimal("5.00"));
        cargoFijo.setPeriodicidad("MENSUAL");
        cargoFijo.setBaseCalculo("FIJO");
        cargoFijo.setActivo(true);
        prod.setCargos(List.of(cargoFijo));

        when(productoRepository.findById(2L)).thenReturn(Optional.of(prod));

        SimulacionClienteRequestDto req = new SimulacionClienteRequestDto(
                new BigDecimal("5000.00"),
                "MENSUAL",
                12,
                SistemaAmortizacion.FRANCES,
                null,
                2L,
                2L,
                null,
                new BigDecimal("8000.00"),
                2L
        );

        SimulacionClienteResponseDto resp = simuladorService.simularCliente(req);
        assertNotNull(resp);
        assertEquals(12, resp.tablaCuotas().size());

        // Verificar cuota 1
        var c1 = resp.tablaCuotas().get(0);
        assertEquals(0, new BigDecimal("5.00").compareTo(c1.cargosIndirectos()));

        // Cuota total = capital + interes + desgravamen + cargosIndirectos
        BigDecimal sumaEsperada = c1.capital().add(c1.interes()).add(c1.desgravamen()).add(c1.cargosIndirectos());
        assertEquals(0, sumaEsperada.compareTo(c1.cuotaTotal()));

        // Total cargos indirectos = 12 cuotas * $5.00 = $60.00
        assertEquals(0, new BigDecimal("60.00").compareTo(resp.totalCargosIndirectos()));
    }
}
