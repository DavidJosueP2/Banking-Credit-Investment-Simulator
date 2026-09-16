package com.edu.uta.backend.investment;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

@Service
public class InvestmentPdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] create(InvestmentService.SimulationResult result) {
        List<String> lines = new ArrayList<>();
        lines.add("BRUNEXA BANK - SIMULACION DE INVERSION");
        lines.add("Documento informativo. No constituye una contratacion.");
        lines.add("");
        lines.add("Referencia: " + result.reference());
        lines.add("Fecha de simulacion: " + result.simulationDate().format(DATE));
        lines.add("Producto: " + result.productName());
        lines.add("Capital: " + money(result.amount()));
        lines.add("Plazo: " + result.termDays() + " dias");
        lines.add("Tasa nominal anual: " + percent(result.annualRate()));
        lines.add("Base anual: " + result.dayCountBasis() + " dias");
        lines.add("Frecuencia: " + frequency(result.payoutFrequency()));
        lines.add("");
        lines.add("Interes bruto: " + money(result.grossInterest()));
        lines.add("Retencion configurada: " + money(result.withholding()));
        lines.add("Interes neto: " + money(result.netInterest()));
        lines.add("Valor total estimado: " + money(result.maturityValue()));
        lines.add("Vencimiento estimado: " + result.maturityDate().format(DATE));
        lines.add("");
        lines.add("CRONOGRAMA ESTIMADO");
        lines.add("No.   Fecha        Dias      Interes neto      Capital       Total");
        for (InvestmentCalculator.Payment payment : result.payments()) {
            lines.add(String.format(Locale.ROOT, "%-5d %-12s %-9d %-17s %-13s %s",
                    payment.number(), payment.paymentDate().format(DATE), payment.periodDays(),
                    money(payment.netInterest()), money(payment.capital()), money(payment.totalPayment())));
        }
        lines.add("");
        lines.add("Los valores son referenciales y dependen de las condiciones vigentes al contratar.");
        return minimalPdf(lines);
    }

    private byte[] minimalPdf(List<String> lines) {
        StringBuilder stream = new StringBuilder("BT\n/F1 10 Tf\n50 792 Td\n14 TL\n");
        for (String line : lines) {
            stream.append('(').append(escape(line)).append(") Tj\nT*\n");
        }
        stream.append("ET\n");
        byte[] content = stream.toString().getBytes(StandardCharsets.ISO_8859_1);

        List<byte[]> objects = List.of(
                bytes("<< /Type /Catalog /Pages 2 0 R >>"),
                bytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
                bytes("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"),
                bytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
                concat(bytes("<< /Length " + content.length + " >>\nstream\n"), content, bytes("endstream")));

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
        for (int index = 1; index < offsets.size(); index++) {
            write(output, String.format(Locale.ROOT, "%010d 00000 n \n", offsets.get(index)));
        }
        write(output, "trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\nstartxref\n"
                + xref + "\n%%EOF\n");
        return output.toByteArray();
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private String money(BigDecimal value) {
        return String.format(Locale.ROOT, "USD %,.2f", value);
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
            default -> "Al vencimiento";
        };
    }

    private byte[] bytes(String value) {
        return value.getBytes(StandardCharsets.ISO_8859_1);
    }

    private byte[] concat(byte[]... values) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        for (byte[] value : values) output.writeBytes(value);
        return output.toByteArray();
    }

    private void write(ByteArrayOutputStream output, String value) {
        output.writeBytes(bytes(value));
    }
}
