package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.CargoCreditoEntity;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.ReglaNormativaEntity;
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
import com.edu.uta.backend.settings.InstitutionSettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Reglas de crédito con los valores publicados por el BCE para septiembre de 2026 y los rangos
 * prudenciales de la institución (los mismos que siembra V21).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CreditoBoundaryAndEntityTest {

    /** Tasas activas efectivas máximas BCE, septiembre 2026. Iguales para bancos y cooperativas. */
    private static final Map<String, String> TASAS_MAXIMAS_SEP_2026 = Map.ofEntries(
            Map.entry("PRODUCTIVO_CORPORATIVO", "7.72"),
            Map.entry("PRODUCTIVO_EMPRESARIAL", "9.99"),
            Map.entry("PRODUCTIVO_PYMES", "10.15"),
            Map.entry("CONSUMO_PRIORITARIO", "16.77"),
            Map.entry("EDUCATIVO", "9.50"),
            Map.entry("EDUCATIVO_SOCIAL", "7.50"),
            Map.entry("VIVIENDA_VIP", "4.99"),
            Map.entry("VIVIENDA_VIS", "4.99"),
            Map.entry("INMOBILIARIO", "9.26"),
            Map.entry("MICROCREDITO_MINORISTA", "28.23"),
            Map.entry("MICROCREDITO_SIMPLE", "24.89"),
            Map.entry("MICROCREDITO_AMPLIADA", "22.05"));

    @Mock private ProductoCreditoRepository productoRepository;
    @Mock private TasaCreditoRepository tasaCreditoRepository;
    @Mock private TipoCreditoRepository tipoCreditoRepository;
    @Mock private SegmentoCreditoRepository segmentoRepository;
    @Mock private CargoCreditoRepository cargoCreditoRepository;
    @Mock private ReglaNormativaRepository reglaRepository;
    @Mock private JdbcTemplate jdbc;
    @Mock private InstitutionSettingsService settings;

    private NormativaRegulatoriaService normativa;
    private CreditoConfiguracionService configuracion;
    private SimuladorService simulador;

    @BeforeEach
    void setUp() {
        normativa = new NormativaRegulatoriaService(reglaRepository, jdbc) {
            @Override
            public boolean segmentoOfertable(String codigo) {
                return !"CONSUMO_ORDINARIO".equals(codigo);
            }
        };
        configuracion = new CreditoConfiguracionService(productoRepository, tipoCreditoRepository, segmentoRepository,
                tasaCreditoRepository, cargoCreditoRepository, normativa, settings);
        simulador = new SimuladorService(productoRepository, normativa);

        TASAS_MAXIMAS_SEP_2026.forEach((segmento, tasa) -> regla(segmento, "TASA_MAXIMA", tasa));
        regla("CONSUMO_PRIORITARIO", "MONTO_MAXIMO", "30000");
        regla("BANCO", "DESGRAVAMEN_MINIMO", "0.0100");
        regla("BANCO", "DESGRAVAMEN_MAXIMO", "0.0650");
        regla("COOPERATIVA", "DESGRAVAMEN_MINIMO", "0.0400");
        regla("COOPERATIVA", "DESGRAVAMEN_MAXIMO", "0.1200");
        regla("CARGOS", "CARGO_PORCENTAJE_MENSUAL_MAXIMO", "0.5");
        regla("CARGOS", "CARGO_FIJO_MENSUAL_MAXIMO", "50");
        regla("CARGOS", "CARGO_UNICO_PORCENTAJE_MAXIMO", "3");
        regla("CARGOS", "CARGO_UNICO_FIJO_MAXIMO", "500");
        regla("CARGOS", "CARGOS_MAXIMOS_POR_PRODUCTO", "5");

        entidad("BANCO");
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
        when(cargoCreditoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ─── Tasas máximas BCE ───────────────────────────────────────────────────

    @Test
    @DisplayName("Cada segmento acepta exactamente su tasa máxima BCE y rechaza 0,01 puntos más")
    void tasasMaximasDeSeptiembre2026() {
        TASAS_MAXIMAS_SEP_2026.forEach((segmento, tasa) -> {
            BigDecimal maxima = new BigDecimal(tasa);
            assertDoesNotThrow(() -> normativa.validarTasa(segmento, maxima, LocalDate.now()), segmento);
            var ex = assertThrows(NormativaFinancieraException.class,
                    () -> normativa.validarTasa(segmento, maxima.add(new BigDecimal("0.01")), LocalDate.now()), segmento);
            assertTrue(ex.getMessage().contains(String.format(java.util.Locale.ROOT, "%.2f%%", maxima)), ex.getMessage());
        });
    }

    @Test
    @DisplayName("La tasa máxima no cambia entre banco y cooperativa: la norma aplica a todo el sistema")
    void tasaMaximaIgualParaBancoYCooperativa() {
        ConfigurarCreditoRequestDto microcredito = producto("MICROCREDITO_MINORISTA", "28.24", "0.0800", List.of());

        entidad("BANCO");
        assertThrows(NormativaFinancieraException.class, () -> configuracion.configurar(microcredito));
        entidad("COOPERATIVA");
        assertThrows(NormativaFinancieraException.class, () -> configuracion.configurar(microcredito));

        ConfigurarCreditoRequestDto enTope = producto("MICROCREDITO_MINORISTA", "28.23", "0.0800", List.of());
        assertDoesNotThrow(() -> configuracion.configurar(enTope));
    }

    @Test
    @DisplayName("Un segmento sin tasa máxima vigente no se puede configurar")
    void segmentoSinTasaVigenteRechazado() {
        when(reglaRepository.findReglaVigente(eq("INMOBILIARIO"), eq("TASA_MAXIMA"), any())).thenReturn(Optional.empty());
        var ex = assertThrows(NormativaFinancieraException.class,
                () -> normativa.validarTasa("INMOBILIARIO", new BigDecimal("8"), LocalDate.now()));
        assertTrue(ex.getMessage().contains("No hay una tasa máxima vigente"));
    }

    @Test
    @DisplayName("El segmento Consumo ordinario (derogado en 2020) no se ofrece para productos nuevos")
    void segmentoDerogadoRechazado() {
        var ex = assertThrows(NormativaFinancieraException.class,
                () -> configuracion.configurar(producto("CONSUMO_ORDINARIO", "15.00", "0.0500", List.of())));
        assertTrue(ex.getMessage().contains("ya no está vigente"));
    }

    @Test
    @DisplayName("El monto máximo se valida contra la política institucional y así se informa")
    void montoMaximoInstitucional() {
        ConfigurarCreditoRequestDto dto = new ConfigurarCreditoRequestDto("Consumo alto", null, "CONSUMO_PRIORITARIO",
                new BigDecimal("1000"), new BigDecimal("35000"), 12, 60, new BigDecimal("15"),
                new BigDecimal("0.05"), List.of(SistemaAmortizacion.FRANCES), null);
        var ex = assertThrows(NormativaFinancieraException.class, () -> configuracion.configurar(dto));
        assertTrue(ex.getMessage().contains("política institucional"), ex.getMessage());
    }

    // ─── Desgravamen según tipo de entidad ───────────────────────────────────

    @Test
    @DisplayName("Desgravamen: banco 0,0100–0,0650 %; cooperativa 0,0400–0,1200 % mensual")
    void rangoDesgravamenPorTipoDeEntidad() {
        assertDoesNotThrow(() -> normativa.validarDesgravamen("BANCO", new BigDecimal("0.0650"), null));
        assertThrows(NormativaFinancieraException.class,
                () -> normativa.validarDesgravamen("BANCO", new BigDecimal("0.0700"), null));
        assertThrows(NormativaFinancieraException.class,
                () -> normativa.validarDesgravamen("COOPERATIVA", new BigDecimal("0.0300"), null));
        assertDoesNotThrow(() -> normativa.validarDesgravamen("COOPERATIVA", new BigDecimal("0.0700"), null));
    }

    @Test
    @DisplayName("El producto toma la entidad de la configuración institucional, no del formulario")
    void entidadDesdeConfiguracion() {
        entidad("COOPERATIVA");
        ConfigurarCreditoRequestDto dto = new ConfigurarCreditoRequestDto("Consumo socio", "Banco",
                "CONSUMO_PRIORITARIO", new BigDecimal("500"), new BigDecimal("10000"), 6, 48,
                new BigDecimal("15"), new BigDecimal("0.0700"), List.of(SistemaAmortizacion.FRANCES), null);

        var respuesta = configuracion.configurar(dto);

        assertEquals("Cooperativa", respuesta.entidad());
        assertEquals("Consumo socio", respuesta.nombre());
    }

    // ─── Cobros indirectos ───────────────────────────────────────────────────

    @Test
    @DisplayName("Cobros indirectos: la base se deduce del tipo y la periodicidad")
    void cobrosNormalizados() {
        var cargos = normativa.validarCargos(List.of(
                new CargoConfiguracionDto("Seguro vehicular", "PORCENTAJE", new BigDecimal("0.08"), "MENSUAL",
                        null, null, true, "SEGURO"),
                new CargoConfiguracionDto("Gastos notariales", "FIJO", new BigDecimal("40"), "UNICO",
                        "SALDO_DEUDOR", null, true, "GASTO"),
                new CargoConfiguracionDto("Comisión de apertura", "PORCENTAJE", new BigDecimal("1"), "UNICO",
                        "SALDO_DEUDOR", null, true, "GASTO")), null);

        assertEquals("SALDO_DEUDOR", cargos.get(0).baseCalculo());
        assertEquals("FIJO", cargos.get(1).baseCalculo());
        assertEquals("MONTO_SOLICITADO", cargos.get(2).baseCalculo());
    }

    @Test
    @DisplayName("Cobros indirectos: se rechazan donaciones obligatorias, repetidos, topes excedidos y desgravamen duplicado")
    void cobrosEstrictos() {
        assertMensaje("no puede ser obligatoria", new CargoConfiguracionDto("Aporte fundación", "FIJO",
                new BigDecimal("2"), "MENSUAL", "FIJO", null, true, "DONACION"));
        assertMensaje("tope prudencial", new CargoConfiguracionDto("Seguro todo riesgo", "PORCENTAJE",
                new BigDecimal("0.6"), "MENSUAL", "SALDO_DEUDOR", null, true, "SEGURO"));
        assertMensaje("tope prudencial", new CargoConfiguracionDto("Gastos legales", "FIJO",
                new BigDecimal("600"), "UNICO", "FIJO", null, true, "GASTO"));
        assertMensaje("sobre el saldo o sobre el monto", new CargoConfiguracionDto("Seguro vehicular", "PORCENTAJE",
                new BigDecimal("0.08"), "MENSUAL", "FIJO", null, true, "SEGURO"));
        assertMensaje("mayor a 0", new CargoConfiguracionDto("Seguro vida", "PORCENTAJE",
                BigDecimal.ZERO, "MENSUAL", "SALDO_DEUDOR", null, true, "SEGURO"));
        assertMensaje("propio campo", new CargoConfiguracionDto("Seguro de desgravamen extra", "PORCENTAJE",
                new BigDecimal("0.05"), "MENSUAL", "SALDO_DEUDOR", null, true, "SEGURO"));

        var repetido = new CargoConfiguracionDto("Seguro vida", "FIJO", new BigDecimal("2"), "MENSUAL", "FIJO", null, true, "SEGURO");
        var ex = assertThrows(NormativaFinancieraException.class,
                () -> normativa.validarCargos(List.of(repetido, repetido), null));
        assertTrue(ex.getMessage().contains("repetido"));
    }

    // ─── Tabla de amortización con cobros indirectos ─────────────────────────

    @Test
    @DisplayName("Dos seguros y un gasto se suman en la misma columna de cobros indirectos, cuota por cuota")
    void variosSegurosEnUnaColumna() {
        ProductoCreditoEntity prod = productoSimulable(2L, "CONSUMO_PRIORITARIO", "12.00", "0.0500", "MESES");
        CargoCreditoEntity seguroVehiculo = cargo(11L, "Seguro vehicular", TipoCargo.PORCENTAJE, "0.1000", "MENSUAL", "SALDO_DEUDOR", true);
        CargoCreditoEntity seguroDesempleo = cargo(12L, "Seguro de desempleo", TipoCargo.FIJO, "3.00", "MENSUAL", "FIJO", true);
        CargoCreditoEntity gastosNotariales = cargo(13L, "Gastos notariales", TipoCargo.FIJO, "40.00", "UNICO", "FIJO", true);
        CargoCreditoEntity donacion = cargo(14L, "Aporte fundación", TipoCargo.FIJO, "1.00", "MENSUAL", "FIJO", false);
        prod.setCargos(List.of(seguroVehiculo, seguroDesempleo, gastosNotariales, donacion));
        when(productoRepository.findById(2L)).thenReturn(Optional.of(prod));

        SimulacionClienteResponseDto resp = simulador.simularCliente(solicitud(2L, "5000.00", 12, SistemaAmortizacion.FRANCES, null));

        for (var cuota : resp.tablaCuotas()) {
            BigDecimal esperado = cuota.saldoInicial().multiply(new BigDecimal("0.001"))
                    .add(new BigDecimal("3.00"))
                    .add(cuota.numeroCuota() == 1 ? new BigDecimal("40.00") : BigDecimal.ZERO)
                    .setScale(2, RoundingMode.HALF_UP);
            assertEquals(0, esperado.compareTo(cuota.cargosIndirectos()), "cuota " + cuota.numeroCuota());
            BigDecimal suma = cuota.capital().add(cuota.interes()).add(cuota.desgravamen()).add(cuota.cargosIndirectos());
            assertEquals(0, suma.compareTo(cuota.cuotaTotal()), "cuota " + cuota.numeroCuota());
        }
        BigDecimal totalCargos = resp.tablaCuotas().stream().map(SimulacionClienteResponseDto.CuotaClienteDto::cargosIndirectos)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, totalCargos.compareTo(resp.totalCargosIndirectos()));
        assertEquals(0, resp.totalCapital().add(resp.totalIntereses()).add(resp.totalDesgravamen())
                .add(resp.totalCargosIndirectos()).compareTo(resp.totalPagar()));
        assertEquals(0, new BigDecimal("5000.00").compareTo(resp.totalCapital()));
        assertEquals(0, BigDecimal.ZERO.compareTo(resp.tablaCuotas().getLast().saldoFinal()));
    }

    @Test
    @DisplayName("Un cobro opcional (donación) solo se suma cuando el cliente lo elige")
    void cobroOpcionalSoloSiSeElige() {
        ProductoCreditoEntity prod = productoSimulable(3L, "CONSUMO_PRIORITARIO", "12.00", "0.0500", "MESES");
        prod.setCargos(List.of(cargo(21L, "Aporte fundación", TipoCargo.FIJO, "1.00", "MENSUAL", "FIJO", false)));
        when(productoRepository.findById(3L)).thenReturn(Optional.of(prod));

        var sinDonacion = simulador.simularCliente(solicitud(3L, "2000", 10, SistemaAmortizacion.ALEMAN, null));
        var conDonacion = simulador.simularCliente(solicitud(3L, "2000", 10, SistemaAmortizacion.ALEMAN, List.of(21L)));

        assertEquals(0, BigDecimal.ZERO.compareTo(sinDonacion.totalCargosIndirectos()));
        assertEquals(0, new BigDecimal("10.00").compareTo(conDonacion.totalCargosIndirectos()));
    }

    @Test
    @DisplayName("En cuotas anuales, un seguro mensual se cobra por los 12 meses del período")
    void seguroMensualEnCuotaAnual() {
        ProductoCreditoEntity prod = productoSimulable(4L, "VIVIENDA_VIP", "4.99", "0.0250", "ANIOS");
        prod.setPlazoMinMeses(60);
        prod.setPlazoMaxMeses(300);
        prod.setMontoMin(new BigDecimal("20000"));
        prod.setMontoMax(new BigDecimal("105000"));
        prod.setCargos(List.of(cargo(31L, "Seguro de incendio", TipoCargo.FIJO, "10.00", "MENSUAL", "FIJO", true)));
        when(productoRepository.findById(4L)).thenReturn(Optional.of(prod));

        var resp = simulador.simularCliente(solicitud(4L, "60000", 10, SistemaAmortizacion.FRANCES, null));

        assertEquals("ANUAL", resp.frecuencia());
        assertEquals(0, new BigDecimal("120.00").compareTo(resp.tablaCuotas().getFirst().cargosIndirectos()));
    }

    @Test
    @DisplayName("Desgravamen de la cuota 1 = saldo inicial × tasa mensual")
    void desgravamenCuotaUno() {
        ProductoCreditoEntity prod = productoSimulable(10L, "CONSUMO_PRIORITARIO", "14.00", "0.0500", "MESES");
        when(productoRepository.findById(10L)).thenReturn(Optional.of(prod));

        var cuota1 = simulador.simularCliente(solicitud(10L, "10000.00", 12, SistemaAmortizacion.FRANCES, null))
                .tablaCuotas().getFirst();

        assertEquals(0, new BigDecimal("5.00").compareTo(cuota1.desgravamen()));
    }

    @Test
    @DisplayName("Un producto con tasa por encima del tope vigente no se ofrece ni se simula")
    void productoFueraDeTopeNoSeOfrece() {
        ProductoCreditoEntity prod = productoSimulable(6L, "PRODUCTIVO_PYMES", "11.50", "0.0300", "MESES");
        when(productoRepository.findAllByActivoTrueOrderByOrdenAsc()).thenReturn(List.of(prod));
        when(productoRepository.findById(6L)).thenReturn(Optional.of(prod));

        assertTrue(simulador.obtenerProductosDisponibles().isEmpty());
        var ex = assertThrows(NormativaFinancieraException.class,
                () -> simulador.simularCliente(solicitud(6L, "10000", 24, SistemaAmortizacion.FRANCES, null)));
        assertTrue(ex.getMessage().contains("supera la tasa máxima vigente"));
    }

    @Test
    @DisplayName("El monto a financiar no puede superar el valor del bien")
    void montoMayorAlValorDelBien() {
        ProductoCreditoEntity prod = productoSimulable(1L, "CONSUMO_PRIORITARIO", "15.00", "0.0500", "MESES");
        when(productoRepository.findById(1L)).thenReturn(Optional.of(prod));

        var req = new SimulacionClienteRequestDto(new BigDecimal("12000"), "MENSUAL", 24, SistemaAmortizacion.FRANCES,
                null, 1L, 1L, null, new BigDecimal("10000"), 1L);
        var ex = assertThrows(NormativaFinancieraException.class, () -> simulador.simularCliente(req));
        assertTrue(ex.getMessage().contains("no puede ser mayor que el costo total"));
    }

    // ─── Utilidades ──────────────────────────────────────────────────────────

    private void assertMensaje(String fragmento, CargoConfiguracionDto cargo) {
        var ex = assertThrows(NormativaFinancieraException.class, () -> normativa.validarCargos(List.of(cargo), null));
        assertTrue(ex.getMessage().contains(fragmento), ex.getMessage());
    }

    private void entidad(String tipo) {
        when(settings.entityType()).thenReturn(tipo);
        when(settings.entityLabel()).thenReturn(tipo.equals("BANCO") ? "Banco" : "Cooperativa");
    }

    private void regla(String segmento, String tipo, String limite) {
        ReglaNormativaEntity regla = new ReglaNormativaEntity();
        regla.setSegmento(segmento);
        regla.setTipoParametro(tipo);
        regla.setLimite(new BigDecimal(limite));
        regla.setNormativa(tipo.startsWith("TASA") ? "Tasa activa efectiva máxima – septiembre 2026" : "Política institucional");
        regla.setFechaInicioVigencia(LocalDate.of(2026, 9, 1));
        when(reglaRepository.findReglaVigente(eq(segmento), eq(tipo), any())).thenReturn(Optional.of(regla));
    }

    private static ConfigurarCreditoRequestDto producto(String segmento, String tasa, String desgravamen,
                                                        List<CargoConfiguracionDto> cargos) {
        return new ConfigurarCreditoRequestDto("Producto de prueba", null, segmento, new BigDecimal("500"),
                new BigDecimal("3000"), 3, 36, new BigDecimal(tasa), new BigDecimal(desgravamen),
                List.of(SistemaAmortizacion.FRANCES), null, "MESES", cargos);
    }

    private static ProductoCreditoEntity productoSimulable(Long id, String segmento, String tasa, String desgravamen,
                                                           String unidad) {
        ProductoCreditoEntity prod = new ProductoCreditoEntity();
        prod.setId(id);
        prod.setNombre("Producto " + id);
        prod.setEntidad("Banco");
        prod.setSegmentoBce(segmento);
        prod.setMontoMin(new BigDecimal("500.00"));
        prod.setMontoMax(new BigDecimal("30000.00"));
        prod.setPlazoMinMeses(6);
        prod.setPlazoMaxMeses(60);
        prod.setUnidadPlazo(unidad);
        prod.setTasaDesgravamenMensual(new BigDecimal(desgravamen));
        prod.setSistemasPermitidos("FRANCES,ALEMAN");
        prod.setActivo(true);
        TasaCreditoEntity t = new TasaCreditoEntity();
        t.setActivo(true);
        t.setValor(new BigDecimal(tasa));
        prod.setTasas(List.of(t));
        prod.setCargos(List.of());
        return prod;
    }

    private static CargoCreditoEntity cargo(Long id, String nombre, TipoCargo tipo, String valor, String periodicidad,
                                            String base, boolean obligatorio) {
        CargoCreditoEntity c = new CargoCreditoEntity();
        c.setId(id);
        c.setNombre(nombre);
        c.setTipoCargo(tipo);
        c.setValor(new BigDecimal(valor));
        c.setPeriodicidad(periodicidad);
        c.setBaseCalculo(base);
        c.setObligatorio(obligatorio);
        c.setActivo(true);
        return c;
    }

    private static SimulacionClienteRequestDto solicitud(Long productoId, String monto, int plazo,
                                                         SistemaAmortizacion sistema, List<Long> opcionales) {
        return new SimulacionClienteRequestDto(new BigDecimal(monto), null, plazo, sistema, null, productoId,
                productoId, null, null, productoId, opcionales);
    }
}
