package com.edu.uta.backend.verification;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.edu.uta.backend.identity.EcuadorianId;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.textract.TextractClient;
import software.amazon.awssdk.services.textract.model.BlockType;
import software.amazon.awssdk.services.textract.model.Document;

/**
 * Lee la cédula ecuatoriana con Textract. Soporta los dos modelos en circulación:
 * el antiguo ("APELLIDOS Y NOMBRES" junto, fechas 2004-06-14) y el nuevo
 * ("APELLIDOS" y "NOMBRES" por separado, fechas "10 FEB 2005", cédula en la línea NUI).
 * Las líneas no llegan en orden visual, así que cada campo se ancla a su etiqueta por geometría.
 */
@Service
public class DocumentOcrService {

    private static final Pattern ONLY_ID = Pattern.compile("[\\s.:]*(\\d{9})[\\s-]?(\\d)[\\s.]*");
    private static final Pattern ANY_ID = Pattern.compile("\\d{10}");
    private static final Pattern ISO_DATE = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
    private static final Pattern SPANISH_DATE = Pattern.compile("(\\d{1,2})\\s+([A-ZÁÉÍÓÚ]{3,4})\\s+(\\d{4})");
    private static final Pattern NAME_LINE = Pattern.compile("[A-ZÁÉÍÓÚÑ' ]{2,60}");
    private static final double SAME_COLUMN = 0.06;
    private static final double LABEL_GAP = 0.09;

    private static final Map<String, Integer> MONTHS = Map.ofEntries(
            Map.entry("ENE", 1), Map.entry("FEB", 2), Map.entry("MAR", 3), Map.entry("ABR", 4),
            Map.entry("MAY", 5), Map.entry("JUN", 6), Map.entry("JUL", 7), Map.entry("AGO", 8),
            Map.entry("SEP", 9), Map.entry("SEPT", 9), Map.entry("OCT", 10), Map.entry("NOV", 11),
            Map.entry("DIC", 12));

    /** Etiquetas que cortan la lectura de un valor multilínea. */
    private static final Set<String> LABELS = Set.of("APELLIDOS", "NOMBRES", "NACIONALIDAD", "SEXO",
            "CONDICION", "CONDICIONCIUDADANIA", "IDENTIDAD", "CEDULADE", "ESTADOCIVIL", "INSTRUCCION",
            "FIRMADELTITULAR", "NATCAN", "REPUBLICADELECUADOR");
    private static final List<String> LABEL_PREFIXES = List.of("FECHA", "LUGAR", "NO", "NUI", "PROFESION");

    private final TextractClient textract;

    public DocumentOcrService(TextractClient textract) {
        this.textract = textract;
    }

    public record CedulaData(String idNumber, String lastNames, String firstNames, LocalDate birthDate) {}

    record Line(String text, double confidence, double left, double top) {}

    public CedulaData read(byte[] image) {
        return parse(textract.detectDocumentText(request -> request
                        .document(Document.builder().bytes(SdkBytes.fromByteArray(image)).build()))
                .blocks().stream()
                .filter(block -> block.blockType() == BlockType.LINE)
                .map(block -> new Line(block.text(), block.confidence(),
                        block.geometry().boundingBox().left(), block.geometry().boundingBox().top()))
                .toList());
    }

    CedulaData parse(List<Line> lines) {
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("No pudimos leer el documento. Toma la foto con mejor luz.");
        }

        String idNumber = findIdNumber(lines)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No encontramos el número de cédula en la imagen. Asegúrate de que se vea completo."));
        String[] names = findNames(lines);
        return new CedulaData(idNumber, names[0], names[1], findBirthDate(lines).orElse(null));
    }

    private Optional<String> findIdNumber(List<Line> lines) {
        // El modelo nuevo trae "No. DOCUMENTO" (que no es la cédula) y la cédula real tras "NUI".
        for (Line line : lines) {
            if (!normalize(line.text()).startsWith("NUI")) continue;
            Optional<String> fromNui = firstValidId(line.text());
            if (fromNui.isPresent()) return fromNui;
        }
        for (Line line : lines) {
            Matcher matcher = ONLY_ID.matcher(line.text());
            if (matcher.matches()) {
                String candidate = matcher.group(1) + matcher.group(2);
                if (EcuadorianId.valid(candidate)) return Optional.of(candidate);
            }
        }
        for (Line line : lines) {
            Optional<String> anywhere = firstValidId(line.text());
            if (anywhere.isPresent()) return anywhere;
        }
        return Optional.empty();
    }

    private Optional<String> firstValidId(String text) {
        Matcher matcher = ANY_ID.matcher(text.replaceAll("[\\s.-]", ""));
        while (matcher.find()) {
            if (EcuadorianId.valid(matcher.group())) return Optional.of(matcher.group());
        }
        return Optional.empty();
    }

    private Optional<LocalDate> findBirthDate(List<Line> lines) {
        for (Line line : lines) {
            if (!normalize(line.text()).contains("FECHADENACIMIENTO")) continue;
            Optional<LocalDate> sameLine = parseDate(line.text());
            if (sameLine.isPresent()) return sameLine;
            return lines.stream()
                    .filter(other -> Math.abs(other.left() - line.left()) < SAME_COLUMN)
                    .filter(other -> other.top() > line.top() && other.top() - line.top() < LABEL_GAP)
                    .sorted(Comparator.comparingDouble(Line::top))
                    .map(other -> parseDate(other.text()))
                    .flatMap(Optional::stream)
                    .findFirst();
        }
        return Optional.empty();
    }

    /** Devuelve {apellidos, nombres}. */
    private String[] findNames(List<Line> lines) {
        String lastNames = null;
        String firstNames = null;
        for (Line line : lines) {
            String label = normalize(line.text());
            if (label.contains("PADRE") || label.contains("MADRE")) continue;
            if (label.equals("APELLIDOSYNOMBRES") || label.equals("APELLIDOSNOMBRES")) {
                List<Line> below = lines.stream()
                        .filter(other -> Math.abs(other.left() - line.left()) < SAME_COLUMN)
                        .filter(other -> other.top() > line.top())
                        .filter(other -> NAME_LINE.matcher(other.text().trim()).matches())
                        .sorted(Comparator.comparingDouble(Line::top))
                        .toList();
                if (below.size() >= 2) {
                    return new String[] {below.get(0).text().trim(), below.get(1).text().trim()};
                }
            }
            if (label.equals("APELLIDOS")) lastNames = valueUnder(lines, line);
            if (label.equals("NOMBRES")) firstNames = valueUnder(lines, line);
        }
        return new String[] {lastNames, firstNames};
    }

    /** Junta las líneas bajo una etiqueta hasta topar con la siguiente etiqueta. */
    private String valueUnder(List<Line> lines, Line anchor) {
        StringBuilder value = new StringBuilder();
        List<Line> below = lines.stream()
                .filter(other -> Math.abs(other.left() - anchor.left()) < SAME_COLUMN)
                .filter(other -> other.top() > anchor.top())
                .sorted(Comparator.comparingDouble(Line::top))
                .toList();
        for (Line candidate : below) {
            String text = candidate.text().trim();
            if (isLabel(normalize(text)) || !NAME_LINE.matcher(text).matches()) break;
            if (!value.isEmpty()) value.append(' ');
            value.append(text);
        }
        return value.isEmpty() ? null : value.toString();
    }

    private boolean isLabel(String normalized) {
        return LABELS.contains(normalized)
                || LABEL_PREFIXES.stream().anyMatch(normalized::startsWith);
    }

    private Optional<LocalDate> parseDate(String text) {
        Matcher iso = ISO_DATE.matcher(text);
        if (iso.find()) {
            try {
                return Optional.of(LocalDate.parse(iso.group()));
            } catch (DateTimeParseException exception) {
                return Optional.empty();
            }
        }
        Matcher spanish = SPANISH_DATE.matcher(text.toUpperCase(Locale.ROOT));
        if (spanish.find()) {
            Integer month = MONTHS.get(normalize(spanish.group(2)));
            if (month == null) return Optional.empty();
            try {
                return Optional.of(LocalDate.of(Integer.parseInt(spanish.group(3)), month,
                        Integer.parseInt(spanish.group(1))));
            } catch (RuntimeException exception) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private String normalize(String text) {
        String withoutAccents = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return withoutAccents.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }
}
