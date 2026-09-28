package com.edu.uta.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

/**
 * Contrato con la fuente oficial: la migración debe sembrar exactamente las tasas publicadas por el
 * BCE para septiembre de 2026 (contenido.bce.fin.ec, Tasas de interés, "Tasas vigentes").
 */
class NormativaSeedTests {

    private static final Map<String, String[]> OFICIAL = Map.ofEntries(
            // segmento -> {referencial, máxima}
            Map.entry("PRODUCTIVO_CORPORATIVO", new String[] {"7.03", "7.72"}),
            Map.entry("PRODUCTIVO_EMPRESARIAL", new String[] {"9.05", "9.99"}),
            Map.entry("PRODUCTIVO_PYMES", new String[] {"8.98", "10.15"}),
            Map.entry("CONSUMO_PRIORITARIO", new String[] {"15.74", "16.77"}),
            Map.entry("EDUCATIVO", new String[] {"8.83", "9.50"}),
            Map.entry("EDUCATIVO_SOCIAL", new String[] {"5.49", "7.50"}),
            Map.entry("VIVIENDA_VIP", new String[] {"4.99", "4.99"}),
            Map.entry("VIVIENDA_VIS", new String[] {"4.99", "4.99"}),
            Map.entry("INMOBILIARIO", new String[] {"8.55", "9.26"}),
            Map.entry("MICROCREDITO_MINORISTA", new String[] {"19.65", "28.23"}),
            Map.entry("MICROCREDITO_SIMPLE", new String[] {"20.74", "24.89"}),
            Map.entry("MICROCREDITO_AMPLIADA", new String[] {"18.53", "22.05"}));

    @Test
    void migrationSeedsTheOfficialSeptember2026Rates() throws IOException {
        String sql;
        try (InputStream in = getClass().getResourceAsStream("/db/migration/V21__normativa_bce_septiembre_2026.sql")) {
            sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        Matcher row = Pattern.compile("\\('([A-Z_]+)',\\s*'(TASA_MAXIMA|TASA_REFERENCIAL)',\\s*([0-9.]+)\\)").matcher(sql);
        Map<String, BigDecimal> seeded = new HashMap<>();
        while (row.find()) seeded.put(row.group(1) + "/" + row.group(2), new BigDecimal(row.group(3)));

        OFICIAL.forEach((segmento, tasas) -> {
            BigDecimal referencial = seeded.get(segmento + "/TASA_REFERENCIAL");
            BigDecimal maxima = seeded.get(segmento + "/TASA_MAXIMA");
            assertEquals(0, new BigDecimal(tasas[0]).compareTo(referencial), segmento + " referencial");
            assertEquals(0, new BigDecimal(tasas[1]).compareTo(maxima), segmento + " máxima");
            assertTrue(referencial.compareTo(maxima) <= 0, segmento + ": la referencial no puede superar la máxima");
        });
    }
}
