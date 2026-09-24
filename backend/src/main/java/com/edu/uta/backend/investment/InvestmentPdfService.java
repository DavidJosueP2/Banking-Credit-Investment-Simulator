package com.edu.uta.backend.investment;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import com.edu.uta.backend.settings.InstitutionSettingsService;

@Service
public class InvestmentPdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    private static final float LEFT = 42;
    private static final float RIGHT = PAGE_WIDTH - 42;
    private static final float CONTENT_WIDTH = RIGHT - LEFT;
    private static final int ROWS_PER_PAGE = 16;

    private final InstitutionSettingsService settings;

    public InvestmentPdfService(InstitutionSettingsService settings) {
        this.settings = settings;
    }

    public byte[] create(InvestmentService.SimulationResult result) {
        InstitutionSettingsService.SettingsView institution = settings.effectiveSettings();
        PdfTheme theme = PdfTheme.from(institution.sections().getOrDefault("appearance", Map.of()));
        String institutionName = value(institution, "institution", "institutionName", "Brunexa Bank");
        String legalNotice = value(institution, "institution", "legalNotice",
                "Los valores presentados son referenciales y no constituyen una oferta financiera.");

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            FontSet fonts = loadFonts(document, theme.headingFont(), theme.bodyFont());
            PDImageXObject logo = loadLogo(document, institution, theme.primary());
            List<InvestmentCalculator.Payment> payments = result.payments();
            int pageCount = Math.max(1, (int) Math.ceil(payments.size() / (double) ROWS_PER_PAGE));

            for (int pageNumber = 0; pageNumber < pageCount; pageNumber++) {
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                try (PDPageContentStream canvas = new PDPageContentStream(document, page)) {
                    paintPage(canvas, theme);
                    drawHeader(canvas, fonts, theme, logo, institutionName, result.productName());
                    drawSummary(canvas, fonts, theme, result);
                    int start = pageNumber * ROWS_PER_PAGE;
                    int end = Math.min(payments.size(), start + ROWS_PER_PAGE);
                    drawSchedule(canvas, fonts, theme, payments.subList(start, end), result.currency());
                    drawFooter(canvas, fonts, theme, institutionName, legalNotice, pageNumber + 1, pageCount);
                }
            }
            document.save(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("No se pudo generar el PDF de la simulación.", exception);
        }
    }

    private void paintPage(PDPageContentStream canvas, PdfTheme theme) throws IOException {
        fillRect(canvas, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, theme.background());
        fillRect(canvas, 0, PAGE_HEIGHT - 92, PAGE_WIDTH, 92, theme.primary());
    }

    private void drawHeader(PDPageContentStream canvas, FontSet fonts, PdfTheme theme, PDImageXObject logo,
            String institutionName, String productName) throws IOException {
        Color headerText = contrast(theme.primary());
        if (logo != null) {
            float maxWidth = 132;
            float maxHeight = 48;
            float scale = Math.min(maxWidth / logo.getWidth(), maxHeight / logo.getHeight());
            float width = logo.getWidth() * scale;
            float height = logo.getHeight() * scale;
            canvas.drawImage(logo, LEFT, PAGE_HEIGHT - 70, width, height);
        } else {
            text(canvas, fonts.headingBold(), 17, LEFT, PAGE_HEIGHT - 52, institutionName, headerText);
        }
        textRight(canvas, fonts.body(), 8, RIGHT, PAGE_HEIGHT - 48,
                "Documento informativo", headerText);
        text(canvas, fonts.headingBold(), 18, LEFT, PAGE_HEIGHT - 120,
                "Simulación de inversión", theme.foreground());
        text(canvas, fonts.body(), 9, LEFT, PAGE_HEIGHT - 139, productName, theme.mutedText());
        line(canvas, LEFT, PAGE_HEIGHT - 151, RIGHT, PAGE_HEIGHT - 151, theme.secondary(), 2);
    }

    private void drawSummary(PDPageContentStream canvas, FontSet fonts, PdfTheme theme,
            InvestmentService.SimulationResult result) throws IOException {
        float y = PAGE_HEIGHT - 178;
        text(canvas, fonts.headingBold(), 9, LEFT, y, "DETALLES DE LA INVERSIÓN", theme.secondary());
        labelValue(canvas, fonts, theme, LEFT, y - 25, "Fecha de simulación", result.simulationDate().format(DATE));
        labelValue(canvas, fonts, theme, 220, y - 25, "Fecha de vencimiento", result.maturityDate().format(DATE));
        labelValue(canvas, fonts, theme, 398, y - 25, "Referencia", result.reference());

        float boxY = y - 107;
        fillRect(canvas, LEFT, boxY, CONTENT_WIDTH, 52, theme.surface());
        strokeRect(canvas, LEFT, boxY, CONTENT_WIDTH, 52, theme.border(), 0.8f);
        metric(canvas, fonts, theme, LEFT + 15, boxY + 31, "CAPITAL INVERTIDO",
                money(result.amount(), result.currency()), theme.foreground());
        metric(canvas, fonts, theme, LEFT + 180, boxY + 31, "INTERÉS NETO",
                money(result.netInterest(), result.currency()), theme.primary());
        metric(canvas, fonts, theme, LEFT + 350, boxY + 31, "VALOR ESTIMADO",
                money(result.maturityValue(), result.currency()), theme.secondary());

        float detailsY = boxY - 21;
        text(canvas, fonts.body(), 8, LEFT, detailsY,
                "Plazo: " + result.termValue() + " " + termUnit(result.termUnit(), result.termValue()), theme.mutedText());
        text(canvas, fonts.body(), 8, 170, detailsY, "Tasa anual: " + percent(result.annualRate()), theme.mutedText());
        text(canvas, fonts.body(), 8, 300, detailsY, "Pago: " + frequency(result.payoutFrequency()), theme.mutedText());
        text(canvas, fonts.body(), 8, 430, detailsY,
                "Retención: " + money(result.withholding(), result.currency()), theme.mutedText());
    }

    private void drawSchedule(PDPageContentStream canvas, FontSet fonts, PdfTheme theme,
            List<InvestmentCalculator.Payment> payments, String currency) throws IOException {
        float titleY = PAGE_HEIGHT - 330;
        text(canvas, fonts.headingBold(), 10, LEFT, titleY, "CRONOGRAMA DE FLUJOS", theme.secondary());
        text(canvas, fonts.body(), 7.5f, LEFT, titleY - 16,
                "Los intereses corresponden a cada período y el capital se devuelve al vencimiento.", theme.mutedText());

        float tableTop = titleY - 33;
        float rowHeight = 23;
        float[] columns = {LEFT, LEFT + 33, LEFT + 102, LEFT + 136, LEFT + 224, LEFT + 305, LEFT + 389, LEFT + 456, RIGHT};
        String[] headers = {"Pago", "Fecha", "Días", "Interés bruto", "Retención", "Interés neto", "Capital", "Total"};
        fillRect(canvas, LEFT, tableTop - rowHeight, CONTENT_WIDTH, rowHeight, theme.primary());
        Color headerText = contrast(theme.primary());
        for (int index = 0; index < headers.length; index++) {
            text(canvas, fonts.bodyBold(), 6.7f, columns[index] + 5, tableTop - 15, headers[index], headerText);
        }

        float y = tableTop - rowHeight;
        for (int index = 0; index < payments.size(); index++) {
            InvestmentCalculator.Payment payment = payments.get(index);
            y -= rowHeight;
            fillRect(canvas, LEFT, y, CONTENT_WIDTH, rowHeight,
                    index % 2 == 0 ? theme.surface() : theme.muted());
            line(canvas, LEFT, y, RIGHT, y, theme.border(), 0.4f);
            String[] values = {
                    String.valueOf(payment.number()), payment.paymentDate().format(DATE), String.valueOf(payment.periodDays()),
                    money(payment.grossInterest(), currency), money(payment.withholding(), currency),
                    money(payment.netInterest(), currency), money(payment.capital(), currency), money(payment.totalPayment(), currency)
            };
            for (int column = 0; column < values.length; column++) {
                PDFont font = column == values.length - 1 ? fonts.bodyBold() : fonts.body();
                if (column >= 3) {
                    textRight(canvas, font, 6.5f, columns[column + 1] - 5, y + 8, values[column], theme.foreground());
                } else {
                    text(canvas, font, 6.5f, columns[column] + 5, y + 8, values[column], theme.foreground());
                }
            }
        }
    }

    private void drawFooter(PDPageContentStream canvas, FontSet fonts, PdfTheme theme, String institutionName,
            String legalNotice, int pageNumber, int pageCount) throws IOException {
        line(canvas, LEFT, 57, RIGHT, 57, theme.primary(), 0.8f);
        text(canvas, fonts.body(), 6.7f, LEFT, 43, institutionName, theme.mutedText());
        text(canvas, fonts.body(), 6.2f, LEFT, 29, shorten(legalNotice, 118), theme.mutedText());
        textRight(canvas, fonts.bodyBold(), 6.7f, RIGHT, 43,
                "Página " + pageNumber + " de " + pageCount, theme.primary());
    }

    private FontSet loadFonts(PDDocument document, String headingName, String bodyName) throws IOException {
        return new FontSet(
                loadFont(document, headingName, false), loadFont(document, headingName, true),
                loadFont(document, bodyName, false), loadFont(document, bodyName, true));
    }

    private PDFont loadFont(PDDocument document, String configuredName, boolean bold) throws IOException {
        String family = configuredName == null ? "" : configuredName.toLowerCase(Locale.ROOT);
        String resource;
        if (family.contains("plus jakarta")) {
            resource = bold ? "/fonts/PlusJakartaSans-Bold.ttf" : "/fonts/PlusJakartaSans-Regular.ttf";
        } else if (family.contains("axiforma")) {
            resource = bold ? "/fonts/Axiforma-SemiBold.ttf" : "/fonts/Axiforma-Regular.ttf";
        } else if (family.contains("baskerville") || family.contains("georgia") || family.contains("times")) {
            return new PDType1Font(bold ? Standard14Fonts.FontName.TIMES_BOLD : Standard14Fonts.FontName.TIMES_ROMAN);
        } else {
            return new PDType1Font(bold ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA);
        }
        try (InputStream stream = getClass().getResourceAsStream(resource)) {
            if (stream == null) throw new IOException("No se encontró la fuente para el reporte: " + resource);
            return PDType0Font.load(document, stream, false);
        }
    }

    private PDImageXObject loadLogo(PDDocument document, InstitutionSettingsService.SettingsView view,
            Color headerColor) {
        boolean darkHeader = luminance(headerColor) < 0.52;
        List<String> keys = darkHeader
                ? List.of("fullLogoDark", "markLogoDark", "fullLogoLight", "markLogoLight")
                : List.of("fullLogoLight", "markLogoLight", "fullLogoDark", "markLogoDark");
        for (String key : keys) {
            if (!view.assets().containsKey(key)) continue;
            try {
                InstitutionSettingsService.Asset asset = settings.asset(key);
                return PDImageXObject.createFromByteArray(document, asset.content(), asset.fileName());
            } catch (IOException | RuntimeException ignored) {
            }
        }
        try (InputStream stream = getClass().getResourceAsStream("/branding/brunexa-logo.png")) {
            return stream == null ? null : PDImageXObject.createFromByteArray(document, stream.readAllBytes(), "logo");
        } catch (IOException exception) {
            return null;
        }
    }

    private void labelValue(PDPageContentStream canvas, FontSet fonts, PdfTheme theme,
            float x, float y, String label, String value) throws IOException {
        text(canvas, fonts.body(), 7.5f, x, y, label, theme.mutedText());
        text(canvas, fonts.bodyBold(), 9, x, y - 15, value, theme.foreground());
    }

    private void metric(PDPageContentStream canvas, FontSet fonts, PdfTheme theme,
            float x, float y, String label, String value, Color valueColor) throws IOException {
        text(canvas, fonts.bodyBold(), 7, x, y, label, theme.mutedText());
        text(canvas, fonts.headingBold(), 11, x, y - 17, value, valueColor);
    }

    private void text(PDPageContentStream canvas, PDFont font, float size, float x, float y,
            String value, Color color) throws IOException {
        canvas.beginText();
        canvas.setFont(font, size);
        canvas.setNonStrokingColor(color);
        canvas.newLineAtOffset(x, y);
        canvas.showText(value == null ? "" : value);
        canvas.endText();
    }

    private void textRight(PDPageContentStream canvas, PDFont font, float size, float right, float y,
            String value, Color color) throws IOException {
        float width = font.getStringWidth(value) / 1000f * size;
        text(canvas, font, size, right - width, y, value, color);
    }

    private void fillRect(PDPageContentStream canvas, float x, float y, float width, float height, Color color)
            throws IOException {
        canvas.setNonStrokingColor(color);
        canvas.addRect(x, y, width, height);
        canvas.fill();
    }

    private void strokeRect(PDPageContentStream canvas, float x, float y, float width, float height,
            Color color, float lineWidth) throws IOException {
        canvas.setStrokingColor(color);
        canvas.setLineWidth(lineWidth);
        canvas.addRect(x, y, width, height);
        canvas.stroke();
    }

    private void line(PDPageContentStream canvas, float x1, float y1, float x2, float y2,
            Color color, float width) throws IOException {
        canvas.setStrokingColor(color);
        canvas.setLineWidth(width);
        canvas.moveTo(x1, y1);
        canvas.lineTo(x2, y2);
        canvas.stroke();
    }

    private String value(InstitutionSettingsService.SettingsView view, String section, String key, String fallback) {
        return view.sections().getOrDefault(section, Map.of()).getOrDefault(key, fallback);
    }

    private String termUnit(String unit, int value) {
        return switch (unit) {
            case "MONTHS" -> value == 1 ? "mes" : "meses";
            case "YEARS" -> value == 1 ? "año" : "años";
            default -> value == 1 ? "día" : "días";
        };
    }

    private String money(BigDecimal value, String currency) {
        return (currency == null ? "USD" : currency) + " " + String.format(Locale.ROOT, "%,.2f", value);
    }

    private String percent(BigDecimal value) {
        return value.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%";
    }

    private String frequency(String value) {
        return switch (value) {
            case "MONTHLY" -> "Mensual";
            case "BIMONTHLY" -> "Bimestral";
            case "QUARTERLY" -> "Trimestral";
            case "SEMIANNUAL" -> "Semestral";
            case "ANNUAL" -> "Anual";
            default -> "Al vencimiento";
        };
    }

    private String shorten(String value, int maximum) {
        if (value == null || value.length() <= maximum) return value == null ? "" : value;
        return value.substring(0, maximum - 1).trim() + "…";
    }

    private static Color contrast(Color background) {
        return luminance(background) < 0.52 ? Color.WHITE : new Color(0x172022);
    }

    private static double luminance(Color color) {
        return (0.2126 * color.getRed() + 0.7152 * color.getGreen() + 0.0722 * color.getBlue()) / 255d;
    }

    private record FontSet(PDFont heading, PDFont headingBold, PDFont body, PDFont bodyBold) {}

    private record PdfTheme(Color primary, Color secondary, Color background, Color foreground,
            Color surface, Color muted, Color mutedText, Color border, String headingFont, String bodyFont) {
        static PdfTheme from(Map<String, String> appearance) {
            return new PdfTheme(
                    color(appearance.getOrDefault("brandPrimaryColor", "#08747b")),
                    color(appearance.getOrDefault("brandSecondaryColor", "#946928")),
                    color(appearance.getOrDefault("backgroundLightColor", "#f2f2f2")),
                    color(appearance.getOrDefault("foregroundLightColor", "#202527")),
                    color(appearance.getOrDefault("surfaceLightColor", "#ffffff")),
                    color(appearance.getOrDefault("mutedLightColor", "#e6e9e8")),
                    color(appearance.getOrDefault("mutedTextLightColor", "#586064")),
                    color(appearance.getOrDefault("borderLightColor", "#dadddd")),
                    appearance.getOrDefault("headingFont", "Axiforma"),
                    appearance.getOrDefault("sansFont", "Plus Jakarta Sans"));
        }

        private static Color color(String value) {
            try {
                return Color.decode(value);
            } catch (NumberFormatException exception) {
                return new Color(0x202527);
            }
        }
    }
}
