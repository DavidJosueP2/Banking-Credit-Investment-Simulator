package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.enums.SistemaAmortizacion;
import com.edu.uta.backend.dto.SimulacionClienteRequestDto;
import com.edu.uta.backend.dto.SimulacionClienteResponseDto;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

/**
 * "¿Cuánto me prestan?": busca el mayor monto cuya cuota más alta no supere lo que la persona puede
 * pagar. No tiene fórmula propia: prueba montos con el simulador de créditos, así el resultado incluye
 * desgravamen y cobros indirectos exactamente como se cobrarían.
 */
@Service
@RequiredArgsConstructor
public class CapacidadPagoService {

    private static final BigDecimal PRECISION = BigDecimal.ONE;

    private final SimuladorService simulador;
    private final ProductoCreditoRepository productos;

    public record Solicitud(Long productoId, BigDecimal cuotaDisponible, Integer plazo, SistemaAmortizacion sistema,
                            List<Long> cargosOpcionales) {}

    public record Resultado(BigDecimal montoMaximo, BigDecimal cuotaMaxima, boolean limitadoPorProducto,
                            SimulacionClienteResponseDto simulacion) {}

    @Transactional(readOnly = true)
    public Resultado calcular(Solicitud solicitud) {
        if (solicitud.productoId() == null) throw new NormativaFinancieraException("Selecciona un tipo de crédito.");
        if (solicitud.sistema() == null) throw new NormativaFinancieraException("Selecciona el sistema de amortización.");
        if (solicitud.plazo() == null || solicitud.plazo() <= 0) throw new NormativaFinancieraException("Ingresa el plazo.");
        BigDecimal cuota = solicitud.cuotaDisponible();
        if (cuota == null || cuota.signum() <= 0) {
            throw new NormativaFinancieraException("Ingresa la cuota que puedes pagar.");
        }
        ProductoCreditoEntity producto = productos.findById(solicitud.productoId())
                .orElseThrow(() -> new NormativaFinancieraException("El tipo de crédito seleccionado no existe."));

        BigDecimal minimo = producto.getMontoMin();
        BigDecimal maximo = producto.getMontoMax();

        SimulacionClienteResponseDto conMinimo = simular(solicitud, minimo);
        if (cuotaMaxima(conMinimo).compareTo(cuota) > 0) {
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "Con esa cuota no alcanzas el monto mínimo de este crédito ($%.2f): su cuota sería de $%.2f. "
                            + "Prueba con un plazo más largo u otro tipo de crédito.", minimo, cuotaMaxima(conMinimo)));
        }
        SimulacionClienteResponseDto conMaximo = simular(solicitud, maximo);
        if (cuotaMaxima(conMaximo).compareTo(cuota) <= 0) {
            return new Resultado(maximo, cuotaMaxima(conMaximo), true, conMaximo);
        }

        // La cuota crece con el monto: búsqueda binaria manteniendo "bajo" siempre pagable.
        BigDecimal bajo = minimo;
        BigDecimal alto = maximo;
        SimulacionClienteResponseDto mejor = conMinimo;
        while (alto.subtract(bajo).compareTo(PRECISION) > 0) {
            BigDecimal medio = bajo.add(alto).divide(BigDecimal.TWO, 0, RoundingMode.DOWN);
            if (medio.compareTo(bajo) <= 0) break;
            SimulacionClienteResponseDto intento = simular(solicitud, medio);
            if (cuotaMaxima(intento).compareTo(cuota) <= 0) {
                bajo = medio;
                mejor = intento;
            } else {
                alto = medio;
            }
        }
        return new Resultado(mejor.monto(), cuotaMaxima(mejor), false, mejor);
    }

    private SimulacionClienteResponseDto simular(Solicitud solicitud, BigDecimal monto) {
        return simulador.simularCliente(new SimulacionClienteRequestDto(monto, null, solicitud.plazo(), solicitud.sistema(),
                null, solicitud.productoId(), solicitud.productoId(), null, null, solicitud.productoId(),
                solicitud.cargosOpcionales()));
    }

    /** La cuota más alta del cronograma: en el sistema alemán es la primera; con un cobro único, también. */
    static BigDecimal cuotaMaxima(SimulacionClienteResponseDto simulacion) {
        return simulacion.tablaCuotas().stream()
                .map(SimulacionClienteResponseDto.CuotaClienteDto::cuotaTotal)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }
}
