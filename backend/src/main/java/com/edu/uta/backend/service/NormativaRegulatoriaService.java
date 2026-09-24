package com.edu.uta.backend.service;

import com.edu.uta.backend.config.NormativaFinancieraException;
import com.edu.uta.backend.domain.entity.ReglaNormativaEntity;
import com.edu.uta.backend.repository.ReglaNormativaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NormativaRegulatoriaService {

    private final ReglaNormativaRepository reglaRepository;

    public record ReglaNormativaDto(
            Long id,
            String segmento,
            String tipoParametro,
            BigDecimal limite,
            String unidad,
            LocalDate fechaInicioVigencia,
            LocalDate fechaFinVigencia,
            String normativa,
            String resolucion,
            String organismo
    ) {}

    // Tabla de respaldo en memoria si la BD aún no cuenta con registros
    private static final Map<String, BigDecimal> TOPE_TASA_FALLBACK = new HashMap<>();
    private static final Map<String, BigDecimal> TOPE_MONTO_FALLBACK = new HashMap<>();
    private static final Map<String, Integer> TOPE_PLAZO_FALLBACK = new HashMap<>();

    static {
        TOPE_TASA_FALLBACK.put("CONSUMO_PRIORITARIO", new BigDecimal("16.77"));
        TOPE_TASA_FALLBACK.put("CONSUMO_ORDINARIO", new BigDecimal("17.30"));
        TOPE_TASA_FALLBACK.put("MICROCREDITO_MINORISTA", new BigDecimal("28.23"));
        TOPE_TASA_FALLBACK.put("MICROCREDITO_SIMPLE", new BigDecimal("25.50"));
        TOPE_TASA_FALLBACK.put("MICROCREDITO_AMPLIADA", new BigDecimal("25.50"));
        TOPE_TASA_FALLBACK.put("VIVIENDA_VIP", new BigDecimal("4.99"));
        TOPE_TASA_FALLBACK.put("VIVIENDA_VIS", new BigDecimal("4.99"));
        TOPE_TASA_FALLBACK.put("INMOBILIARIO", new BigDecimal("10.40"));
        TOPE_TASA_FALLBACK.put("PRODUCTIVO_PYMES", new BigDecimal("11.83"));
        TOPE_TASA_FALLBACK.put("PRODUCTIVO_EMPRESARIAL", new BigDecimal("10.21"));
        TOPE_TASA_FALLBACK.put("PRODUCTIVO_CORPORATIVO", new BigDecimal("9.33"));
        TOPE_TASA_FALLBACK.put("EDUCATIVO", new BigDecimal("9.50"));

        TOPE_MONTO_FALLBACK.put("CONSUMO_PRIORITARIO", new BigDecimal("30000.00"));
        TOPE_MONTO_FALLBACK.put("CONSUMO_ORDINARIO", new BigDecimal("30000.00"));
        TOPE_MONTO_FALLBACK.put("MICROCREDITO_MINORISTA", new BigDecimal("3000.00"));
        TOPE_MONTO_FALLBACK.put("MICROCREDITO_SIMPLE", new BigDecimal("10000.00"));
        TOPE_MONTO_FALLBACK.put("VIVIENDA_VIP", new BigDecimal("105000.00"));
        TOPE_MONTO_FALLBACK.put("VIVIENDA_VIS", new BigDecimal("80000.00"));
        TOPE_MONTO_FALLBACK.put("INMOBILIARIO", new BigDecimal("500000.00"));
        TOPE_MONTO_FALLBACK.put("PRODUCTIVO_PYMES", new BigDecimal("500000.00"));
        TOPE_MONTO_FALLBACK.put("EDUCATIVO", new BigDecimal("20000.00"));

        TOPE_PLAZO_FALLBACK.put("CONSUMO_PRIORITARIO", 60);
        TOPE_PLAZO_FALLBACK.put("CONSUMO_ORDINARIO", 60);
        TOPE_PLAZO_FALLBACK.put("MICROCREDITO_MINORISTA", 36);
        TOPE_PLAZO_FALLBACK.put("MICROCREDITO_SIMPLE", 48);
        TOPE_PLAZO_FALLBACK.put("VIVIENDA_VIP", 300);
        TOPE_PLAZO_FALLBACK.put("INMOBILIARIO", 240);
        TOPE_PLAZO_FALLBACK.put("PRODUCTIVO_PYMES", 60);
        TOPE_PLAZO_FALLBACK.put("EDUCATIVO", 84);
    }

    @Transactional(readOnly = true)
    public List<ReglaNormativaDto> listarReglasVigentes(LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        List<ReglaNormativaEntity> entidades = reglaRepository.findAllVigentes(f);
        if (!entidades.isEmpty()) {
            return entidades.stream().map(this::toDto).toList();
        }

        // Si la tabla estuviese vacía, retornar fallback estructurado
        List<ReglaNormativaDto> fallbackList = new ArrayList<>();
        TOPE_TASA_FALLBACK.forEach((seg, tasa) -> {
            fallbackList.add(new ReglaNormativaDto(
                    null, seg, "TASA_MAXIMA", tasa, "PORCENTAJE",
                    LocalDate.of(2026, 1, 1), null,
                    "Resolución BCE Tasa Activa Máxima", "BCE-2026-001", "BCE"
            ));
        });
        return fallbackList;
    }

    public void validarTasa(String segmentoBce, BigDecimal tasa, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        LocalDate f = fecha != null ? fecha : LocalDate.now();

        Optional<ReglaNormativaEntity> reglaOpt = reglaRepository.findReglaVigente(key, "TASA_MAXIMA", f);
        BigDecimal tasaMaxima = reglaOpt.map(ReglaNormativaEntity::getLimite)
                .orElseGet(() -> TOPE_TASA_FALLBACK.getOrDefault(key, new BigDecimal("16.77")));

        if (tasa.compareTo(tasaMaxima) > 0) {
            String fuente = reglaOpt.map(r -> r.getNormativa() + " (" + r.getResolucion() + ")")
                    .orElse("Publicación Oficial BCE");
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "La tasa ingresada (%.2f%%) supera la tasa máxima legal del %.2f%% permitida por el Banco Central del Ecuador (BCE) para el segmento '%s'. Fuente: %s.",
                    tasa, tasaMaxima, key, fuente
            ));
        }
    }

    public void validarMonto(String segmentoBce, BigDecimal montoMax, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        LocalDate f = fecha != null ? fecha : LocalDate.now();

        Optional<ReglaNormativaEntity> reglaOpt = reglaRepository.findReglaVigente(key, "MONTO_MAXIMO", f);
        BigDecimal montoMaxLegal = reglaOpt.map(ReglaNormativaEntity::getLimite)
                .orElseGet(() -> TOPE_MONTO_FALLBACK.get(key));

        if (montoMaxLegal != null && montoMax.compareTo(montoMaxLegal) > 0) {
            String fuente = reglaOpt.map(r -> r.getNormativa() + " (" + r.getResolucion() + ")")
                    .orElse("Junta de Política y Regulación Financiera");
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "El monto máximo ingresado ($%.2f) excede el tope legal de $%.2f fijado para el segmento '%s'. Fuente: %s.",
                    montoMax, montoMaxLegal, key, fuente
            ));
        }
    }

    public void validarPlazo(String segmentoBce, int plazoMaxMeses, LocalDate fecha) {
        String key = normalizarSegmentoKey(segmentoBce);
        LocalDate f = fecha != null ? fecha : LocalDate.now();

        Optional<ReglaNormativaEntity> reglaOpt = reglaRepository.findReglaVigente(key, "PLAZO_MAXIMO", f);
        Integer plazoMaxLegal = reglaOpt.map(r -> r.getLimite().intValue())
                .orElseGet(() -> TOPE_PLAZO_FALLBACK.get(key));

        if (plazoMaxLegal != null && plazoMaxMeses > plazoMaxLegal) {
            String fuente = reglaOpt.map(r -> r.getNormativa() + " (" + r.getResolucion() + ")")
                    .orElse("Junta de Política y Regulación Financiera");
            throw new NormativaFinancieraException(String.format(Locale.ROOT,
                    "El plazo máximo ingresado (%d meses) excede el límite normativo de %d meses fijado para el segmento '%s'. Fuente: %s.",
                    plazoMaxMeses, plazoMaxLegal, key, fuente
            ));
        }
    }

    public void validarDesgravamen(String entidad, BigDecimal desgravamen) {
        if (desgravamen == null) return;

        if (desgravamen.compareTo(BigDecimal.ZERO) < 0) {
            throw new NormativaFinancieraException("La tasa de desgravamen no puede ser negativa");
        }

        String entNorm = entidad != null ? entidad.trim().toLowerCase(Locale.ROOT) : "";
        if (entNorm.contains("banco")) {
            // Superintendencia de Bancos: tope 0.0650% mensual
            if (desgravamen.compareTo(new BigDecimal("0.0650")) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "Para Bancos, la tasa de desgravamen mensual (%.4f%%) excede el tope legal de 0.0650%% mensual fijado por la Superintendencia de Bancos.",
                        desgravamen));
            }
        } else if (entNorm.contains("cooperativa")) {
            // SEPS: rango 0.0400% a 0.1200% mensual
            if (desgravamen.compareTo(new BigDecimal("0.0400")) < 0 || desgravamen.compareTo(new BigDecimal("0.1200")) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "Para Cooperativas, la tasa de desgravamen mensual (%.4f%%) debe ubicarse en el rango normativo de la SEPS (0.0400%% a 0.1200%% mensual).",
                        desgravamen));
            }
        } else {
            // Rango prudencial general
            if (desgravamen.compareTo(new BigDecimal("0.3000")) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "La tasa de desgravamen mensual (%.4f%%) excede el límite financiero prudencial (máximo 0.30%% mensual).",
                        desgravamen));
            }
        }
    }

    public void validarCargoIndirecto(String nombre, String tipoCargo, BigDecimal valor, String baseCalculo) {
        if (nombre == null || nombre.isBlank()) {
            throw new NormativaFinancieraException("El nombre del cargo indirecto es obligatorio");
        }
        if (valor == null || valor.compareTo(BigDecimal.ZERO) < 0) {
            throw new NormativaFinancieraException("El valor del cargo indirecto no puede ser negativo");
        }

        String nNorm = nombre.trim().toLowerCase(Locale.ROOT);

        // Control regulatorio: Gastos notariales / cobranza
        if (nNorm.contains("cobranza") || nNorm.contains("notar")) {
            // Regulado por JPRFM: no puede superar $50 en valor fijo o 2%
            if ("FIJO".equalsIgnoreCase(tipoCargo) && valor.compareTo(new BigDecimal("100.00")) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El cargo '%s' ($%.2f) excede el tope normativo de $100.00 fijado por la JPRFM para gastos administrativos.",
                        nombre, valor));
            }
        }

        // Control regulatorio: Seguros estructurales o multirriesgo
        if (nNorm.contains("incendio") || nNorm.contains("terremoto") || nNorm.contains("seguro")) {
            if ("PORCENTAJE".equalsIgnoreCase(tipoCargo) && valor.compareTo(new BigDecimal("0.5000")) > 0) {
                throw new NormativaFinancieraException(String.format(Locale.ROOT,
                        "El seguro indirecto '%s' (%.4f%%) supera el tope técnico del 0.50%% mensual fijado por la Superintendencia de Bancos/Compañías.",
                        nombre, valor));
            }
        }
    }

    public String normalizarSegmentoKey(String input) {
        if (input == null) return "CONSUMO_PRIORITARIO";
        String s = input.toUpperCase().trim();
        for (String key : TOPE_TASA_FALLBACK.keySet()) {
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

    private ReglaNormativaDto toDto(ReglaNormativaEntity e) {
        return new ReglaNormativaDto(
                e.getId(),
                e.getSegmento(),
                e.getTipoParametro(),
                e.getLimite(),
                e.getUnidad(),
                e.getFechaInicioVigencia(),
                e.getFechaFinVigencia(),
                e.getNormativa(),
                e.getResolucion(),
                e.getOrganismo()
        );
    }
}
