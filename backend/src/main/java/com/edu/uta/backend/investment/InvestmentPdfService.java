package com.edu.uta.backend.investment;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.zip.DeflaterOutputStream;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;

import org.springframework.stereotype.Service;

import com.edu.uta.backend.settings.InstitutionSettingsService;

@Service
public class InvestmentPdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int PAGE_WIDTH = 612;
    private static final int PAGE_HEIGHT = 842;
    private static final int LEFT = 42;
    private static final int RIGHT = 570;
    private static final int TABLE_WIDTH = RIGHT - LEFT;
    private static final int ROW_HEIGHT = 22;

    private final InstitutionSettingsService settings;

    public InvestmentPdfService(InstitutionSettingsService settings) {
        this.settings = settings;
    }

    public byte[] create(InvestmentService.SimulationResult result) {
        InstitutionSettingsService.SettingsView institution = settings.effectiveSettings();
        String institutionName = value(institution, "institution", "institutionName", "Brunexa Bank");
        int primary = color(value(institution, "appearance", "brandPrimaryColor", "#08747b"));
        int secondary = color(value(institution, "appearance", "brandSecondaryColor", "#946928"));

        ImageAsset logo = loadLogo(institution.assets(), primary);
        List<Page> pages = new ArrayList<>();
        List<InvestmentCalculator.Payment> payments = result.payments();
        int paymentIndex = 0;
        do {
            Page page = new Page();
            drawHeader(page, institutionName, result.productName(), primary, secondary, logo);
            drawSummary(page, result, secondary);
            paymentIndex = drawSchedule(page, payments, paymentIndex, result.currency(), primary, secondary);
            drawFooter(page, institutionName, primary);
            pages.add(page);
        } while (paymentIndex < payments.size());

        return PdfDocument.write(pages, logo);
    }

    private void drawHeader(Page page, String institutionName, String productName,
            int primary, int secondary, ImageAsset logo) {
        page.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 0xf7f9f9);
        page.rect(0, PAGE_HEIGHT - 92, PAGE_WIDTH, 92, primary);
        if (logo != null) {
            page.image(logo, 42, PAGE_HEIGHT - 76, 118, 50);
        } else {
            page.rect(42, PAGE_HEIGHT - 72, 38, 38, secondary);
            page.text(51, PAGE_HEIGHT - 58, 16, "B", 0xffffff, true);
            page.text(92, PAGE_HEIGHT - 49, 17, institutionName, 0xffffff, true);
        }
        page.text(42, PAGE_HEIGHT - 112, 18, "Simulación de inversión", primary, true);
        page.text(42, PAGE_HEIGHT - 132, 10, clean(productName), 0x4b5563, false);
        page.line(42, PAGE_HEIGHT - 145, RIGHT, PAGE_HEIGHT - 145, secondary, 2);
    }

    private void drawSummary(Page page, InvestmentService.SimulationResult result, int secondary) {
        int y = PAGE_HEIGHT - 172;
        page.text(42, y, 10, "DETALLES DE LA INVERSION", secondary, true);
        page.text(42, y - 23, 10, "Fecha de simulación", 0x64748b, false);
        page.text(42, y - 38, 11, result.simulationDate().format(DATE), 0x172022, false);
        page.text(220, y - 23, 10, "Fecha de vencimiento", 0x64748b, false);
        page.text(220, y - 38, 11, result.maturityDate().format(DATE), 0x172022, false);

        int boxY = y - 105;
        page.roundedRect(42, boxY, 528, 48, 0xffffff, 0xd8e2e2);
        page.text(58, boxY + 30, 9, "CAPITAL INVERTIDO", 0x64748b, true);
        page.text(58, boxY + 13, 13, money(result.amount(), result.currency()), 0x172022, true);
        page.text(205, boxY + 30, 9, "INTERÉS NETO", 0x64748b, true);
        page.text(205, boxY + 13, 13, money(result.netInterest(), result.currency()), 0x08747b, true);
        page.text(352, boxY + 30, 9, "VALOR ESTIMADO", 0x64748b, true);
        page.text(352, boxY + 13, 13, money(result.maturityValue(), result.currency()), 0x946928, true);

        int detailsY = boxY - 22;
        page.text(42, detailsY, 9, "Plazo: " + result.termValue() + " " + termUnit(result.termUnit(), result.termValue()), 0x4b5563, false);
        page.text(180, detailsY, 9, "Tasa: " + percent(result.annualRate()), 0x4b5563, false);
        page.text(300, detailsY, 9, "Pago: " + frequency(result.payoutFrequency()), 0x4b5563, false);
        page.text(438, detailsY, 9, "Retención: " + money(result.withholding(), result.currency()), 0x4b5563, false);
    }

    private String termUnit(String unit, int value) {
        return switch (unit) {
            case "MONTHS" -> value == 1 ? "mes" : "meses";
            case "YEARS" -> value == 1 ? "año" : "años";
            default -> value == 1 ? "día" : "días";
        };
    }

    private int drawSchedule(Page page, List<InvestmentCalculator.Payment> payments,
            int start, String currency, int primary, int secondary) {
        int top = PAGE_HEIGHT - 325;
        page.text(42, top, 11, "CRONOGRAMA DE FLUJOS", secondary, true);
        page.text(42, top - 16, 8, "Los intereses se muestran por periodo; el capital se devuelve al vencimiento.", 0x64748b, false);
        int tableTop = top - 34;
        int rowsAvailable = Math.max(1, (tableTop - 72) / ROW_HEIGHT);
        int end = Math.min(payments.size(), start + rowsAvailable - 1);
        page.rect(42, tableTop - ROW_HEIGHT, TABLE_WIDTH, ROW_HEIGHT, primary);
        String[] headers = {"Pago", "Fecha", "Días", "Interés bruto", "Retención", "Interés neto", "Capital", "Total"};
        int[] x = {50, 84, 153, 192, 277, 357, 435, 510};
        for (int i = 0; i < headers.length; i++) page.text(x[i], tableTop - 15, 7, headers[i], 0xffffff, true);
        int y = tableTop - ROW_HEIGHT;
        for (int index = start; index < end; index++) {
            InvestmentCalculator.Payment payment = payments.get(index);
            y -= ROW_HEIGHT;
            if ((index - start) % 2 == 0) page.rect(42, y, TABLE_WIDTH, ROW_HEIGHT, 0xffffff);
            page.line(42, y, RIGHT, y, 0xd8e2e2, 0.5f);
            String[] values = {
                    String.valueOf(payment.number()), payment.paymentDate().format(DATE), String.valueOf(payment.periodDays()),
                    money(payment.grossInterest(), currency), money(payment.withholding(), currency),
                    money(payment.netInterest(), currency), money(payment.capital(), currency), money(payment.totalPayment(), currency)
            };
            for (int i = 0; i < values.length; i++) page.text(x[i], y + 8, 7, values[i], 0x172022, i == 7);
        }
        return end;
    }

    private void drawFooter(Page page, String institutionName, int primary) {
        page.line(42, 58, RIGHT, 58, primary, 1);
        page.text(42, 42, 7, clean(institutionName), 0x64748b, false);
        page.text(42, 29, 7, "Los valores presentados son una estimacion y pueden estar sujetos a las condiciones vigentes.", 0x64748b, false);
    }

    private ImageAsset loadLogo(java.util.Map<String, String> assets, int backgroundColor) {
        for (String key : List.of("fullLogoLight", "markLogoLight", "fullLogoDark", "markLogoDark")) {
            String path = assets.get(key);
            if (path == null) continue;
            try {
                InstitutionSettingsService.Asset asset = settings.asset(key);
                BufferedImage image = ImageIO.read(new java.io.ByteArrayInputStream(asset.content()));
                if (image != null) return ImageAsset.from(image, backgroundColor);
            } catch (IOException | RuntimeException ignored) {
            }
        }
        try {
            BufferedImage image = ImageIO.read(getClass().getResourceAsStream("/branding/brunexa-logo.png"));
            if (image != null) return ImageAsset.from(image, backgroundColor);
        } catch (IOException | RuntimeException ignored) {
        }
        return null;
    }

    private String value(InstitutionSettingsService.SettingsView view, String section, String key, String fallback) {
        return view.sections().getOrDefault(section, java.util.Map.of()).getOrDefault(key, fallback);
    }

    private int color(String hex) {
        return Integer.parseInt(hex.substring(1), 16);
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

    private String clean(String text) {
        if (text == null) return "";
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replaceAll("[^\\x20-\\x7E]", "");
    }

    private record ImageAsset(int width, int height, byte[] data) {
        static ImageAsset from(BufferedImage source, int backgroundColor) throws IOException {
            BufferedImage image = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = image.createGraphics();
            graphics.setColor(new Color(backgroundColor));
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
            graphics.drawImage(source, 0, 0, null);
            graphics.dispose();
            int width = image.getWidth();
            int height = image.getHeight();
            ByteArrayOutputStream raw = new ByteArrayOutputStream(width * height * 3);
            for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
                int rgb = image.getRGB(x, y);
                raw.write((rgb >> 16) & 0xff);
                raw.write((rgb >> 8) & 0xff);
                raw.write(rgb & 0xff);
            }
            ByteArrayOutputStream compressed = new ByteArrayOutputStream();
            try (DeflaterOutputStream deflater = new DeflaterOutputStream(compressed)) {
                raw.writeTo(deflater);
            }
            return new ImageAsset(width, height, compressed.toByteArray());
        }
    }

    private static final class Page {
        private final StringBuilder content = new StringBuilder();

        void rect(int x, int y, int width, int height, int color) {
            fill(color);
            content.append(x).append(' ').append(y).append(' ').append(width).append(' ').append(height).append(" re f\n");
        }

        void roundedRect(int x, int y, int width, int height, int fill, int stroke) {
            fill(fill);
            stroke(stroke);
            content.append(x).append(' ').append(y).append(' ').append(width).append(' ').append(height).append(" re B\n");
        }

        void line(int x1, int y1, int x2, int y2, int color, float width) {
            stroke(color);
            content.append(width).append(" w ").append(x1).append(' ').append(y1).append(" m ")
                    .append(x2).append(' ').append(y2).append(" l S\n");
        }

        void text(int x, int y, int size, String value, int color, boolean bold) {
            fill(color);
            content.append("BT /").append(bold ? "F2" : "F1").append(' ').append(size).append(" Tf ")
                    .append(x).append(' ').append(y).append(" Td (").append(escape(value)).append(") Tj ET\n");
        }

        void image(ImageAsset image, int x, int y, int width, int height) {
            content.append("q ").append(width).append(" 0 0 ").append(height).append(' ').append(x).append(' ').append(y)
                    .append(" cm /Im1 Do Q\n");
        }

        String stream() { return content.toString(); }

        private void fill(int color) { content.append(rgb(color)).append(" rg\n"); }
        private void stroke(int color) { content.append(rgb(color)).append(" RG\n"); }
        private String rgb(int color) {
            return String.format(Locale.ROOT, "%.4f %.4f %.4f", ((color >> 16) & 255) / 255d,
                    ((color >> 8) & 255) / 255d, (color & 255) / 255d);
        }
        private String escape(String value) {
            return value == null ? "" : value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
        }
    }

    private static final class PdfDocument {
        static byte[] write(List<Page> pages, ImageAsset logo) {
            List<byte[]> objects = new ArrayList<>();
            objects.add(bytes("<< /Type /Catalog /Pages 2 0 R >>"));
            objects.add(null);
            if (logo != null) objects.add(imageObject(logo));
            int fontRegular = logo == null ? 3 : 4;
            int fontBold = fontRegular + 1;
            objects.add(bytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
            objects.add(bytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));

            List<Integer> pageObjectIds = new ArrayList<>();
            for (Page page : pages) {
                int contentId = objects.size() + 1;
                byte[] content = page.stream().getBytes(StandardCharsets.ISO_8859_1);
                objects.add(streamObject(content));
                int pageId = objects.size() + 1;
                pageObjectIds.add(pageId);
                String resources = "<< /Font << /F1 " + fontRegular + " 0 R /F2 " + fontBold + " 0 R >>"
                        + (logo == null ? "" : " /XObject << /Im1 3 0 R >>") + " >>";
                objects.add(bytes("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources "
                        + resources + " /Contents " + contentId + " 0 R >>"));
            }
            StringBuilder kids = new StringBuilder("[");
            pageObjectIds.forEach(id -> kids.append(id).append(" 0 R "));
            kids.append(']');
            objects.set(1, bytes("<< /Type /Pages /Kids " + kids + " /Count " + pages.size() + " >>"));

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            write(output, "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
            List<Integer> offsets = new ArrayList<>();
            offsets.add(0);
            for (int index = 0; index < objects.size(); index++) {
                offsets.add(output.size());
                write(output, (index + 1) + " 0 obj\n");
                output.writeBytes(objects.get(index));
                write(output, "\nendobj\n");
            }
            int xref = output.size();
            write(output, "xref\n0 " + (objects.size() + 1) + "\n0000000000 65535 f \n");
            for (int index = 1; index < offsets.size(); index++) write(output,
                    String.format(Locale.ROOT, "%010d 00000 n \n", offsets.get(index)));
            write(output, "trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\nstartxref\n"
                    + xref + "\n%%EOF\n");
            return output.toByteArray();
        }

        private static byte[] imageObject(ImageAsset image) {
            return streamObject(image.data, "/Type /XObject /Subtype /Image /Width " + image.width
                    + " /Height " + image.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode ");
        }

        private static byte[] streamObject(byte[] data) { return streamObject(data, ""); }
        private static byte[] streamObject(byte[] data, String prefix) {
            return concat(bytes("<< " + prefix + "/Length " + data.length + " >>\nstream\n"), data, bytes("\nendstream"));
        }
        private static byte[] bytes(String value) { return value.getBytes(StandardCharsets.ISO_8859_1); }
        private static byte[] concat(byte[]... values) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            for (byte[] value : values) output.writeBytes(value);
            return output.toByteArray();
        }
        private static void write(ByteArrayOutputStream output, String value) { output.writeBytes(bytes(value)); }
    }
}
