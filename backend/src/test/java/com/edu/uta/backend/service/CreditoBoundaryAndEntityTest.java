package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.dto.ConfigurarCreditoRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.TasaCreditoRepository;
import com.edu.uta.backend.repository.TipoCreditoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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
    private com.edu.uta.backend.repository.SegmentoCreditoRepository segmentoRepository;

    @InjectMocks
    private CreditoConfiguracionService configuracionService;

    @InjectMocks
    private SimuladorService simuladorService;

    @Test
    @DisplayName("CP-02: Microcrédito Minorista con tasa 28.24% excede el tope legal del BCE (28.23%) y debe lanzar excepción")
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
                "Cooperativa", // Se solicita Cooperativa pero el producto es de Banco
                null
        );

        NormativaFinancieraException ex = assertThrows(
                NormativaFinancieraException.class,
                () -> simuladorService.simularCliente(req)
        );

        assertTrue(ex.getMessage().contains("no pertenece a la entidad 'Cooperativa'"));
    }
}
