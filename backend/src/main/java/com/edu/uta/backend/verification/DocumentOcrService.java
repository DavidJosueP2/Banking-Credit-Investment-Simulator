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
 * Lee documentos de identidad con Textract: pasaportes por su MRZ y la cédula ecuatoriana en sus
 * dos modelos en circulación:
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
    private static final Pattern FINGERPRINT_CODE = Pattern.compile("[A-Z]\\d{4}[A-Z]\\d{4}");
    private static final Pattern LOOSE_FINGERPRINT_CODE = Pattern.compile("[A-Z][0-9OISBZ]{4}[A-Z][0-9OISBZ]{4}");
    private static final Pattern MRZ_CEDULA_LINE = Pattern.compile("I[A-Z<]ECU([A-Z0-9<]{9})(\\d)([0-9<]{15})");
    private static final Pattern MRZ_FIRST_LINE = Pattern.compile("P[A-Z<][A-Z<]{3}([A-Z<]+)");
    private static final Pattern MRZ_SECOND_LINE = Pattern.compile(
            "([A-Z0-9<]{9})(\\d)([A-Z<]{3})(\\d{6})(\\d)[MFX<](\\d{6})(\\d)");
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

    public enum FingerprintCheck { MATCH, MISMATCH, NOT_FOUND }

    /** idNumber sale de la MRZ, que solo trae el modelo nuevo; en el antiguo es null. */
    public record CedulaBack(FingerprintCheck fingerprint, String idNumber) {}

    public record PassportData(String number, String nationality, String lastNames, String firstNames,
                               LocalDate birthDate, LocalDate expiryDate) {}

    public record CedulaData(String idNumber, String lastNames, String firstNames, LocalDate birthDate) {}

    record Line(String text, double confidence, double left, double top) {}

    public CedulaData read(byte[] image) {
        return parse(lines(image));
    }

    /** Busca en el reverso el código dactilar que escribió el cliente y, si hay MRZ, la cédula. */
    public CedulaBack readCedulaBack(byte[] image, String expectedCode) {
        List<Line> lines = lines(image);
        return new CedulaBack(fingerprintCode(lines, expectedCode), cedulaFromMrz(lines).orElse(null));
    }

    /**
     * El reverso de la cédula nueva trae una MRZ TD1 cuya primera línea es
     * I&lt;ECU + número de documento + dígito verificador + cédula (I&lt;ECU0647202159&lt;&lt;&lt;&lt;&lt;1850191253).
     * Si el dígito no cuadra se ignora: la lectura dudosa no debe bloquear, solo la que contradice.
     */
    Optional<String> cedulaFromMrz(List<Line> lines) {
        return lines.stream()
                .map(line -> MRZ_CEDULA_LINE.matcher(mrzText(line.text())))
                .filter(Matcher::lookingAt)
                .filter(line -> checkDigit(line.group(1)) == Character.getNumericValue(line.group(2).charAt(0)))
                .map(line -> line.group(3).replace("<", ""))
                .filter(EcuadorianId::valid)
                .findFirst();
    }

    public PassportData readPassport(byte[] image) {
        return parsePassport(lines(image));
    }

    /**
     * Lee la zona de lectura mecánica (MRZ, formato TD3) de la página de datos. Es más fiable que
     * el texto impreso y cada campo trae su dígito verificador, así que un error de OCR se detecta.
     */
    PassportData parsePassport(List<Line> lines) {
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("No pudimos leer el pasaporte. Toma la foto con mejor luz.");
        }
        List<String> mrz = lines.stream()
                .map(line -> mrzText(line.text()))
                .filter(text -> text.length() >= 28 && text.indexOf('<') >= 0)
                .toList();
        Matcher second = mrz.stream()
                .map(text -> MRZ_SECOND_LINE.matcher(text))
                .filter(Matcher::lookingAt)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No encontramos las dos líneas con <<< al pie de la página de datos. Fotografía la página completa."));

        String number = second.group(1);
        if (checkDigit(number) != Character.getNumericValue(second.group(2).charAt(0))
                || checkDigit(second.group(4)) != Character.getNumericValue(second.group(5).charAt(0))
                || checkDigit(second.group(6)) != Character.getNumericValue(second.group(7).charAt(0))) {
            throw new IllegalArgumentException(
                    "No pudimos leer con claridad los datos del pasaporte. Toma la foto sin reflejos.");
        }

        String lastNames = null;
        String firstNames = null;
        Optional<Matcher> first = mrz.stream()
                .map(text -> MRZ_FIRST_LINE.matcher(text))
                .filter(Matcher::lookingAt)
                .findFirst();
        if (first.isPresent()) {
            String[] parts = first.get().group(1).split("<<", 2);
            lastNames = mrzWords(parts[0]);
            firstNames = parts.length > 1 ? mrzWords(parts[1]) : null;
        }
        return new PassportData(number.replace("<", ""), second.group(3).replace("<", ""), lastNames, firstNames,
                mrzDate(second.group(4), false), mrzDate(second.group(6), true));
    }

    private static String mrzText(String text) {
        return text.toUpperCase(Locale.ROOT).replace("«", "<<").replaceAll("[^A-Z0-9<]", "");
    }

    private static String mrzWords(String value) {
        String words = value.replace('<', ' ').trim().replaceAll("\\s+", " ");
        return words.isEmpty() ? null : words;
    }

    /** Pesos 7-3-1 de ICAO 9303: dígitos valen lo que son, letras de 10 (A) a 35 (Z) y el relleno 0. */
    static int checkDigit(String value) {
        int[] weights = {7, 3, 1};
        int total = 0;
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            int number = character == '<' ? 0
                    : Character.isDigit(character) ? character - '0' : character - 'A' + 10;
            total += number * weights[index % 3];
        }
        return total % 10;
    }

    /** La MRZ trae el año con dos dígitos: un vencimiento siempre es de este siglo, un nacimiento puede no serlo. */
    private static LocalDate mrzDate(String yymmdd, boolean expiry) {
        int year = Integer.parseInt(yymmdd.substring(0, 2));
        int century = expiry || year <= LocalDate.now().getYear() % 100 ? 2000 : 1900;
        try {
            return LocalDate.of(century + year, Integer.parseInt(yymmdd.substring(2, 4)),
                    Integer.parseInt(yymmdd.substring(4, 6)));
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Las fechas del pasaporte no se leyeron bien. Toma la foto de nuevo.");
        }
    }

    private List<Line> lines(byte[] image) {
        return textract.detectDocumentText(request -> request
                        .document(Document.builder().bytes(SdkBytes.fromByteArray(image)).build()))
                .blocks().stream()
                .filter(block -> block.blockType() == BlockType.LINE)
                .map(block -> new Line(block.text(), block.confidence(),
                        block.geometry().boundingBox().left(), block.geometry().boundingBox().top()))
                .toList();
    }

    /** Normaliza el código dactilar (V4443V4442) o devuelve null si no tiene ese formato. */
    public static String normalizeFingerprintCode(String code) {
        if (code == null) return null;
        String value = code.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return FINGERPRINT_CODE.matcher(value).matches() ? value : null;
    }

    /**
     * Compara ventana a ventana cada línea con el código esperado. Textract confunde O con 0 o
     * I con 1 en tipografías pequeñas, así que ambos lados se llevan a una forma canónica.
     */
    FingerprintCheck fingerprintCode(List<Line> lines, String expected) {
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("No pudimos leer el reverso. Toma la foto con mejor luz.");
        }
        String target = canonical(expected);
        boolean sawCode = false;
        for (Line line : lines) {
            String compact = line.text().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
            String canonicalLine = canonical(compact);
            if (canonicalLine.contains(target)) return FingerprintCheck.MATCH;
            if (LOOSE_FINGERPRINT_CODE.matcher(compact).find()) sawCode = true;
        }
        return sawCode ? FingerprintCheck.MISMATCH : FingerprintCheck.NOT_FOUND;
    }

    private static String canonical(String text) {
        StringBuilder value = new StringBuilder(text.length());
        for (char character : text.toCharArray()) {
            value.append(switch (character) {
                case 'O', 'D', 'Q' -> '0';
                case 'I', 'L' -> '1';
                case 'S' -> '5';
                case 'B' -> '8';
                case 'Z' -> '2';
                default -> character;
            });
        }
        return value.toString();
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
