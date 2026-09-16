package com.edu.uta.backend.settings;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class InstitutionSettingsService {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final long MAX_ASSET_SIZE = 5L * 1024L * 1024L;
    private static final Set<String> IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private static final Set<String> FONT_FAMILIES = Set.of(
            "Libre Baskerville", "Inter", "Georgia", "Times New Roman", "Arial", "system-ui");
    private static final Set<String> ICONS = Set.of(
            "wallet-cards", "bar-chart", "trending-up", "upload", "landmark", "file-text", "shield", "sliders");
    private static final Set<String> ASSET_KEYS = Set.of(
            "fullLogoLight", "fullLogoDark", "markLogoLight", "markLogoDark",
            "heroImage", "carouselCreditImage", "carouselInvestmentImage",
            "creditImage", "investmentImage");

    private static final Map<String, Map<String, String>> DEFAULTS = defaults();

    private final JdbcTemplate jdbc;

    public InstitutionSettingsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record SettingsView(Map<String, Map<String, String>> sections,
                               Map<String, String> assets) {}

    public record Asset(String fileName, String contentType, byte[] content) {}

    public SettingsView effectiveSettings() {
        Map<String, Map<String, String>> sections = deepCopy(DEFAULTS);
        jdbc.query("SELECT category, setting_key, setting_value FROM app_settings",
                row -> {
                    Map<String, String> category = sections.get(row.getString("category"));
                    if (category != null && category.containsKey(row.getString("setting_key"))) {
                        category.put(row.getString("setting_key"), row.getString("setting_value"));
                    }
                });

        Map<String, String> assets = new LinkedHashMap<>();
        jdbc.query("SELECT asset_key, updated_at FROM app_assets ORDER BY asset_key",
                row -> {
                    assets.put(row.getString("asset_key"),
                            "/api/public/settings/assets/" + row.getString("asset_key") +
                                    "?v=" + row.getTimestamp("updated_at").toInstant().toEpochMilli());
                });
        return new SettingsView(sections, assets);
    }

    public Map<String, String> defaultsFor(String category) {
        Map<String, String> defaults = DEFAULTS.get(category);
        if (defaults == null) throw new NoSuchElementException("La sección de configuración no existe");
        return new LinkedHashMap<>(defaults);
    }

    @Transactional
    public SettingsView updateSection(String category, Map<String, String> values, long userId) {
        Map<String, String> defaults = defaultsFor(category);
        if (values == null || values.isEmpty()) throw new IllegalArgumentException("No hay cambios para guardar");

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String key = entry.getKey();
            if (!defaults.containsKey(key)) throw new IllegalArgumentException("El campo " + key + " no pertenece a esta sección");
            String value = normalize(category, key, entry.getValue());
            if (defaults.get(key).equals(value)) {
                jdbc.update("DELETE FROM app_settings WHERE category = ? AND setting_key = ?", category, key);
            } else {
                jdbc.update("INSERT INTO app_settings (category, setting_key, setting_value, updated_at, updated_by) " +
                                "VALUES (?, ?, ?, now(), ?) ON CONFLICT (category, setting_key) DO UPDATE SET " +
                                "setting_value = EXCLUDED.setting_value, updated_at = now(), updated_by = EXCLUDED.updated_by",
                        category, key, value, userId);
            }
        }
        return effectiveSettings();
    }

    @Transactional
    public SettingsView resetSection(String category) {
        defaultsFor(category);
        jdbc.update("DELETE FROM app_settings WHERE category = ?", category);
        return effectiveSettings();
    }

    @Transactional
    public SettingsView resetField(String category, String key) {
        Map<String, String> defaults = defaultsFor(category);
        if (!defaults.containsKey(key)) throw new NoSuchElementException("El campo de configuración no existe");
        jdbc.update("DELETE FROM app_settings WHERE category = ? AND setting_key = ?", category, key);
        return effectiveSettings();
    }

    @Transactional
    public SettingsView saveAsset(String key, MultipartFile file, long userId) {
        validateAssetKey(key);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Selecciona una imagen");
        if (file.getSize() > MAX_ASSET_SIZE) throw new IllegalArgumentException("La imagen no puede superar 5 MB");
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!IMAGE_TYPES.contains(contentType)) throw new IllegalArgumentException("Usa una imagen PNG, JPG o WebP");
        try {
            jdbc.update("INSERT INTO app_assets (asset_key, file_name, content_type, content, updated_at, updated_by) " +
                            "VALUES (?, ?, ?, ?, now(), ?) ON CONFLICT (asset_key) DO UPDATE SET " +
                            "file_name = EXCLUDED.file_name, content_type = EXCLUDED.content_type, content = EXCLUDED.content, " +
                            "updated_at = now(), updated_by = EXCLUDED.updated_by",
                    key, safeFileName(file.getOriginalFilename()), contentType, file.getBytes(), userId);
            return effectiveSettings();
        } catch (java.io.IOException exception) {
            throw new IllegalArgumentException("No se pudo leer la imagen seleccionada", exception);
        }
    }

    @Transactional
    public SettingsView resetAsset(String key) {
        validateAssetKey(key);
        jdbc.update("DELETE FROM app_assets WHERE asset_key = ?", key);
        return effectiveSettings();
    }

    @Transactional
    public SettingsView resetAssets() {
        jdbc.update("DELETE FROM app_assets");
        return effectiveSettings();
    }

    public Asset asset(String key) {
        validateAssetKey(key);
        List<Asset> assets = jdbc.query("SELECT file_name, content_type, content FROM app_assets WHERE asset_key = ?",
                (row, index) -> new Asset(row.getString("file_name"), row.getString("content_type"), row.getBytes("content")), key);
        if (assets.isEmpty()) throw new NoSuchElementException("La imagen no existe");
        return assets.getFirst();
    }

    private String normalize(String category, String key, String rawValue) {
        String value = rawValue == null ? "" : rawValue.trim();
        if (value.length() > 2_000) throw new IllegalArgumentException("El contenido de " + key + " es demasiado largo");

        if (category.equals("appearance") && key.toLowerCase(Locale.ROOT).contains("color")) {
            if (!HEX_COLOR.matcher(value).matches()) throw new IllegalArgumentException("Usa colores hexadecimales como #08747B");
            return value.toLowerCase(Locale.ROOT);
        }
        if (category.equals("appearance") && (key.equals("headingFont") || key.equals("sansFont"))) {
            if (!FONT_FAMILIES.contains(value)) throw new IllegalArgumentException("La tipografía seleccionada no está disponible");
        }
        if (category.equals("landing") && key.endsWith("Icon") && !ICONS.contains(value)) {
            throw new IllegalArgumentException("El icono seleccionado no está disponible");
        }
        if (category.equals("landing") && key.endsWith("Enabled")) {
            if (!value.equals("true") && !value.equals("false"))
                throw new IllegalArgumentException("El valor de " + key + " debe ser verdadero o falso");
        }
        if (category.equals("landing") && key.equals("bannerIntervalSeconds")) {
            try {
                int seconds = Integer.parseInt(value);
                if (seconds < 3 || seconds > 20)
                    throw new IllegalArgumentException("El intervalo del banner debe estar entre 3 y 20 segundos");
                return Integer.toString(seconds);
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("El intervalo del banner debe ser un número de segundos");
            }
        }
        if ((category.equals("credit") || category.equals("investment")) && key.endsWith("Enabled")) {
            if (!value.equals("true") && !value.equals("false")) throw new IllegalArgumentException("El valor de " + key + " debe ser verdadero o falso");
        }
        if (value.isBlank()) throw new IllegalArgumentException("El campo " + key + " no puede quedar vacío");
        return value;
    }

    private void validateAssetKey(String key) {
        if (!ASSET_KEYS.contains(key)) throw new NoSuchElementException("El recurso gráfico no existe");
    }

    private String safeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) return "imagen";
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private static Map<String, Map<String, String>> deepCopy(Map<String, Map<String, String>> source) {
        Map<String, Map<String, String>> copy = new LinkedHashMap<>();
        source.forEach((category, values) -> copy.put(category, new LinkedHashMap<>(values)));
        return copy;
    }

    private static Map<String, Map<String, String>> defaults() {
        Map<String, Map<String, String>> defaults = new LinkedHashMap<>();
        defaults.put("institution", Map.of(
                "institutionName", "Brunexa Bank",
                "shortName", "Brunexa",
                "slogan", "Tus decisiones financieras merecen más claridad.",
                "description", "Un espacio para explorar escenarios de crédito e inversión con información organizada.",
                "supportEmail", "soporte@brunexa.com",
                "supportPhone", "+593 00 000 0000",
                "address", "Ecuador",
                "legalNotice", "Brunexa Bank es una institución ficticia. Los contenidos mostrados no constituyen una oferta financiera real."));
        defaults.put("appearance", Map.ofEntries(
                Map.entry("brandPrimaryColor", "#08747b"),
                Map.entry("brandSecondaryColor", "#946928"),
                Map.entry("brandPrimaryDarkColor", "#70d4cd"),
                Map.entry("brandSecondaryDarkColor", "#e1bd78"),
                Map.entry("backgroundLightColor", "#fafafa"),
                Map.entry("foregroundLightColor", "#202527"),
                Map.entry("surfaceLightColor", "#ffffff"),
                Map.entry("mutedLightColor", "#f3f4f4"),
                Map.entry("mutedTextLightColor", "#586064"),
                Map.entry("sidebarLightColor", "#f0f2f1"),
                Map.entry("borderLightColor", "#dadddd"),
                Map.entry("backgroundDarkColor", "#121516"),
                Map.entry("foregroundDarkColor", "#edf0ef"),
                Map.entry("surfaceDarkColor", "#1c2123"),
                Map.entry("mutedDarkColor", "#272c2e"),
                Map.entry("mutedTextDarkColor", "#adb6b5"),
                Map.entry("sidebarDarkColor", "#1a292b"),
                Map.entry("borderDarkColor", "#3d4547"),
                Map.entry("headingFont", "Libre Baskerville"),
                Map.entry("sansFont", "Inter")));
        defaults.put("landing", Map.ofEntries(
                Map.entry("heroTitle", "Tus decisiones financieras merecen"),
                Map.entry("heroHighlight", "más claridad."),
                Map.entry("heroDescription", "Explora escenarios de crédito e inversión con condiciones administradas por Brunexa, información ordenada y un recorrido pensado para comparar antes de decidir."),
                Map.entry("heroCreditButton", "Explorar créditos"),
                Map.entry("heroInvestmentButton", "Conocer inversiones"),
                Map.entry("bannerEnabled", "true"),
                Map.entry("bannerIntervalSeconds", "6"),
                Map.entry("bannerGeneralTitle", "Más formas de avanzar con {shortName}."),
                Map.entry("bannerGeneralDescription", "{description}"),
                Map.entry("bannerGeneralImageAlt", "Manos cubiertas de colores que representan distintas decisiones y proyectos personales"),
                Map.entry("bannerGeneralButton", "Explorar créditos"),
                Map.entry("bannerGeneralInvestmentButton", "Conocer inversiones"),
                Map.entry("bannerCreditTitle", "Créditos para comparar con tranquilidad."),
                Map.entry("bannerCreditDescription", "Revisa cuotas, plazos y sistemas de amortización antes de elegir una alternativa."),
                Map.entry("bannerCreditImageAlt", "Grupo de personas revisando información alrededor de una mesa"),
                Map.entry("bannerCreditButton", "Ver opciones de crédito"),
                Map.entry("bannerInvestmentTitle", "Una perspectiva clara para tus inversiones."),
                Map.entry("bannerInvestmentDescription", "Proyecta escenarios y entiende las condiciones que acompañan cada decisión."),
                Map.entry("bannerInvestmentImageAlt", "Persona observando una colección de obras en una galería"),
                Map.entry("bannerInvestmentButton", "Conocer inversiones"),
                Map.entry("servicesEnabled", "true"),
                Map.entry("servicesTitle", "Soluciones para entender cada paso."),
                Map.entry("servicesDescription", "Brunexa reúne herramientas para revisar alternativas, comprender sus componentes y continuar el proceso desde un entorno digital."),
                Map.entry("creditServiceTitle", "Simulador de crédito"),
                Map.entry("creditServiceDescription", "Compara monto, plazo y sistema de amortización en un solo recorrido."),
                Map.entry("creditServiceButton", "Explorar créditos"),
                Map.entry("creditServiceIcon", "wallet-cards"),
                Map.entry("amortizationServiceTitle", "Tabla de amortización"),
                Map.entry("amortizationServiceDescription", "Revisa cómo se distribuyen capital, intereses y cargos en cada cuota."),
                Map.entry("amortizationServiceButton", "Conocer el cálculo"),
                Map.entry("amortizationServiceIcon", "bar-chart"),
                Map.entry("investmentServiceTitle", "Proyección de inversión"),
                Map.entry("investmentServiceDescription", "Analiza escenarios según el monto, el plazo y las condiciones definidas."),
                Map.entry("investmentServiceButton", "Explorar inversiones"),
                Map.entry("investmentServiceIcon", "trending-up"),
                Map.entry("applicationServiceTitle", "Solicitud digital"),
                Map.entry("applicationServiceDescription", "Continúa el proceso con documentación e identidad desde tu cuenta."),
                Map.entry("applicationServiceButton", "Conocer el proceso"),
                Map.entry("applicationServiceIcon", "upload"),
                Map.entry("perspectiveEnabled", "true"),
                Map.entry("perspectiveTitle", "Antes de elegir, mira el panorama completo."),
                Map.entry("perspectiveDescription", "La claridad está en conocer el plazo, las condiciones y lo que ocurre después de cada decisión."),
                Map.entry("perspectiveCreditTitle", "Si buscas financiamiento"),
                Map.entry("perspectiveCreditDescription", "Compara la cuota y la composición de los pagos antes de solicitar un crédito."),
                Map.entry("perspectiveInvestmentTitle", "Si quieres proyectar una meta"),
                Map.entry("perspectiveInvestmentDescription", "Revisa escenarios de inversión con sus plazos y condiciones."),
                Map.entry("creditTitle", "Créditos que puedes comprender antes de avanzar."),
                Map.entry("creditDescription", "Define el monto, el plazo y el tipo de crédito para comparar sistemas de amortización y revisar los cargos asociados."),
                Map.entry("creditSectionIcon", "landmark"),
                Map.entry("creditImageAlt", "Asesora explicando una alternativa de crédito a una clienta"),
                Map.entry("creditImageCaption", "Un escenario claro comienza con condiciones bien explicadas."),
                Map.entry("creditBulletOne", "Sistemas de amortización francés y alemán."),
                Map.entry("creditBulletTwo", "Detalle de capital, interés, cuotas y cobros indirectos."),
                Map.entry("creditBulletThree", "Tabla completa preparada para consulta y descarga."),
                Map.entry("creditStatusLabel", "Simulador en preparación"),
                Map.entry("investmentTitle", "Inversiones pensadas para proyectar con contexto."),
                Map.entry("investmentDescription", "Explora cómo cambian los resultados según el monto, el plazo y las condiciones vigentes."),
                Map.entry("investmentSectionIcon", "trending-up"),
                Map.entry("investmentDetail", "Cuando decidas continuar, el proceso conectará tu perfil, documentos y validación de identidad."),
                Map.entry("investmentImageAlt", "Cliente y asesora revisando un escenario de inversión"),
                Map.entry("investmentImageCaption", "Proyectar también significa entender cada condición."),
                Map.entry("investmentFeatureOneTitle", "Escenarios configurables"),
                Map.entry("investmentFeatureOneDescription", "Compara plazos y condiciones sin perder de vista el detalle."),
                Map.entry("investmentFeatureOneIcon", "sliders"),
                Map.entry("investmentFeatureTwoTitle", "Continuidad segura"),
                Map.entry("investmentFeatureTwoDescription", "La solicitud se vinculará a una cuenta identificada."),
                Map.entry("investmentFeatureTwoIcon", "shield"),
                Map.entry("investmentStatusLabel", "Simulador de inversión disponible"),
                Map.entry("processEnabled", "true"),
                Map.entry("processTitle", "Un recorrido ordenado, desde la consulta hasta la solicitud."),
                Map.entry("processDescription", "Cada etapa conserva la información necesaria para que el siguiente paso sea comprensible y verificable."),
                Map.entry("processStepOneTitle", "Explora"),
                Map.entry("processStepOneDescription", "Selecciona el producto y completa los parámetros del escenario que quieres analizar."),
                Map.entry("processStepTwoTitle", "Compara"),
                Map.entry("processStepTwoDescription", "Revisa resultados, composición de pagos y condiciones antes de tomar una decisión."),
                Map.entry("processStepThreeTitle", "Continúa"),
                Map.entry("processStepThreeDescription", "Accede a tu cuenta para completar documentación y los controles de identidad requeridos."),
                Map.entry("closingEnabled", "true"),
                Map.entry("closingTitle", "Tu espacio financiero"),
                Map.entry("closingHighlight", "continúa contigo."),
                Map.entry("closingDescription", "En {shortName} encuentras alternativas para financiar tus proyectos, proyectar tus metas y decidir con información clara."),
                Map.entry("closingBulletOne", "Créditos para impulsar tus proyectos"),
                Map.entry("closingBulletTwo", "Inversiones pensadas para tus metas"),
                Map.entry("closingBulletThree", "Información clara para decidir con calma"),
                Map.entry("closingButton", "Ingresar a {shortName}"),
                Map.entry("headerServicesLabel", "Servicios"),
                Map.entry("headerProcessLabel", "Cómo funciona"),
                Map.entry("footerProductsHeading", "Productos"),
                Map.entry("footerAccessHeading", "Acceso"),
                Map.entry("footerContactHeading", "Contacto"),
                Map.entry("footerHomeLabel", "Inicio")));
        defaults.put("credit", Map.of(
                "moduleEnabled", "true",
                "displayName", "Créditos",
                "simulatorEnabled", "false",
                "frenchSystemEnabled", "true",
                "germanSystemEnabled", "true",
                "indirectChargesEnabled", "true",
                "pdfReportEnabled", "true"));
        defaults.put("investment", Map.of(
                "moduleEnabled", "true",
                "displayName", "Inversiones",
                "simulatorEnabled", "true",
                "onlineApplicationEnabled", "true",
                "documentUploadEnabled", "true",
                "identityValidationEnabled", "true"));
        return Map.copyOf(defaults);
    }
}
