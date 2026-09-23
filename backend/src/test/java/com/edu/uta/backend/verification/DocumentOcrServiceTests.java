package com.edu.uta.backend.verification;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * La geometría de cada caso viene de una lectura real de Textract sobre una cédula física,
 * incluidos sus errores de OCR ("FECHADE NACIMIENTO", "APELLIDOS NOMBRES" sin la Y).
 */
class DocumentOcrServiceTests {

    private final DocumentOcrService service = new DocumentOcrService(null);

    private static DocumentOcrService.Line line(String text, double left, double top) {
        return new DocumentOcrService.Line(text, 99, left, top);
    }

    /** Modelo antiguo: ambas caras escaneadas juntas y las líneas mezcladas entre columnas. */
    private static List<DocumentOcrService.Line> oldModel() {
        return List.of(
                line("REPÚBLICA DEL ECUADOR", 0.171, 0.109),
                line("DIRECCIÓN GENERAL DE REGISTRO CIVIL,", 0.171, 0.121),
                line("CEDULA DE", 0.213, 0.140),
                line("CIUDADANiA*MED", 0.215, 0.149),
                line("APELLIDOS NOMBRES", 0.213, 0.155),
                line("GARCIA ABATA", 0.215, 0.163),
                line("JOSUE JOEL", 0.215, 0.170),
                line("LUGAR DE NACIMIENTO", 0.212, 0.179),
                line("NAPO", 0.216, 0.187),
                line("TENA", 0.216, 0.195),
                line("FECHADE NACIMIENTO 2004-06-14", 0.212, 0.209),
                line("NACIONALIDAD ECUATORIANA", 0.212, 0.218),
                line("150090368-5", 0.346, 0.141),
                line("APELLIDOS Y NOMBRES DEL PADRE", 0.556, 0.125),
                line("GARCIA VASCO FAUSTO RAMIRO", 0.559, 0.134),
                line("APELLIDOS Y NOMBRES DE LA MADRE", 0.555, 0.143),
                line("ABATA SINCHIGUANO SILVIA PATRICIA", 0.558, 0.152),
                line("LUGAR Y FECHA DE EXPEDICIÓN", 0.554, 0.160),
                line("2018-09-07", 0.557, 0.178),
                line("FECHA DE EXPIRACIÓN", 0.554, 0.185),
                line("2028-09-07", 0.557, 0.194));
    }

    /** Modelo nuevo: etiquetas separadas, apellidos en dos líneas y la cédula tras "NUI". */
    private static List<DocumentOcrService.Line> newModel() {
        return List.of(
                line("REPÚBLICA DEL ECUADOR", 0.317, 0.031),
                line("CÉDULA DE", 0.047, 0.065),
                line("IDENTIDAD", 0.047, 0.109),
                line("CONDICIÓN CIUDADANIA", 0.543, 0.117),
                line("APELLIDOS", 0.345, 0.142),
                line("BARRAGAN", 0.346, 0.184),
                line("POZO", 0.347, 0.231),
                line("NOMBRES", 0.347, 0.276),
                line("DAVID JOSUE", 0.348, 0.318),
                line("NACIONALIDAD", 0.349, 0.367),
                line("ECUATORIANA", 0.350, 0.421),
                line("SEXO", 0.738, 0.451),
                line("FECHA DE NACIMIENTO", 0.351, 0.466),
                line("HOMBRE", 0.739, 0.496),
                line("10 FEB 2005", 0.353, 0.521),
                line("No. DOCUMENTO", 0.743, 0.541),
                line("LUGAR DE NACIMIENTO", 0.353, 0.565),
                line("180517215", 0.745, 0.597),
                line("TUNGURAHUA AMBATO", 0.353, 0.611),
                line("FECHA DE VENCIMIENTO", 0.749, 0.639),
                line("LA MERCED", 0.356, 0.672),
                line("24 AGO 2033", 0.754, 0.703),
                line("FIRMA DEL TITULAR", 0.356, 0.730),
                line("NUI.1805177258 Rpf", 0.075, 0.766));
    }

    @Test
    @DisplayName("lee el modelo antiguo aunque las líneas lleguen desordenadas")
    void readsOldModel() {
        DocumentOcrService.CedulaData data = service.parse(oldModel());

        assertThat(data.idNumber()).isEqualTo("1500903685");
        assertThat(data.lastNames()).isEqualTo("GARCIA ABATA");
        assertThat(data.firstNames()).isEqualTo("JOSUE JOEL");
        assertThat(data.birthDate()).isEqualTo(LocalDate.of(2004, 6, 14));
    }

    @Test
    @DisplayName("lee el modelo nuevo con etiquetas separadas y fecha en letras")
    void readsNewModel() {
        DocumentOcrService.CedulaData data = service.parse(newModel());

        assertThat(data.idNumber()).isEqualTo("1805177258");
        assertThat(data.lastNames()).isEqualTo("BARRAGAN POZO");
        assertThat(data.firstNames()).isEqualTo("DAVID JOSUE");
        assertThat(data.birthDate()).isEqualTo(LocalDate.of(2005, 2, 10));
    }

    @Test
    @DisplayName("ignora el número de documento, que no es la cédula")
    void ignoresDocumentNumber() {
        assertThat(service.parse(newModel()).idNumber()).isNotEqualTo("180517215");
    }

    @Test
    @DisplayName("no confunde la fecha de nacimiento con la de vencimiento")
    void doesNotUseExpiryDate() {
        assertThat(service.parse(newModel()).birthDate()).isNotEqualTo(LocalDate.of(2033, 8, 24));
        assertThat(service.parse(oldModel()).birthDate()).isNotEqualTo(LocalDate.of(2028, 9, 7));
    }

    @Test
    @DisplayName("no toma los nombres de los padres del reverso")
    void ignoresParentNames() {
        DocumentOcrService.CedulaData data = service.parse(oldModel());

        assertThat(data.lastNames()).doesNotContain("VASCO");
        assertThat(data.firstNames()).doesNotContain("SILVIA");
    }

    /** Reverso del modelo antiguo: el código dactilar va arriba a la derecha, entre otros datos. */
    private static List<DocumentOcrService.Line> oldBack() {
        return List.of(
                line("INSTRUCCIÓN SUPERIOR", 0.05, 0.10),
                line("PROFESIÓN / OCUPACIÓN ESTUDIANTE", 0.05, 0.16),
                line("V4443 V4442", 0.72, 0.10),
                line("APELLIDOS Y NOMBRES DEL PADRE", 0.05, 0.30),
                line("I<ECU1805177258<<<<<<<<<<<<<<<", 0.05, 0.80));
    }

    /** Reverso del modelo nuevo: código dactilar arriba a la derecha y MRZ TD1 al pie. */
    private static List<DocumentOcrService.Line> newBack() {
        return List.of(
                line("APELLIDOS Y NOMBRES DEL PADRE", 0.05, 0.10),
                line("CÓDIGO DACTILAR", 0.70, 0.08),
                line("V3343V2222", 0.70, 0.13),
                line("TIPO SANGRE", 0.70, 0.18),
                line("I<ECU0647202159<<<<<1850191253", 0.05, 0.78),
                line("0502102M3308246ECU<SI<<<<<<<<<3", 0.05, 0.85),
                line("BARRAGAN<POZO<<DAVID<JOSUE<<<<", 0.05, 0.92));
    }

    @Test
    @DisplayName("lee la cédula de la MRZ del reverso nuevo junto con el código dactilar")
    void readsNewBack() {
        assertThat(service.cedulaFromMrz(newBack())).contains("1850191253");
        assertThat(service.fingerprintCode(newBack(), "V3343V2222"))
                .isEqualTo(DocumentOcrService.FingerprintCheck.MATCH);
    }

    @Test
    @DisplayName("el reverso antiguo no trae MRZ y una MRZ mal leída se ignora")
    void ignoresMissingOrMisreadMrz() {
        assertThat(service.cedulaFromMrz(oldBack())).isEmpty();
        List<DocumentOcrService.Line> misread = List.of(line("I<ECU0647202158<<<<<1850191253", 0.05, 0.78));
        assertThat(service.cedulaFromMrz(misread)).isEmpty();
    }

    @Test
    @DisplayName("encuentra el código dactilar aunque venga separado por espacios")
    void findsFingerprintCode() {
        assertThat(service.fingerprintCode(oldBack(), "V4443V4442"))
                .isEqualTo(DocumentOcrService.FingerprintCheck.MATCH);
    }

    @Test
    @DisplayName("tolera las confusiones típicas del OCR entre letras y números")
    void toleratesOcrConfusions() {
        List<DocumentOcrService.Line> lines = List.of(line("CODIGO DACTILAR: V4O43V4Z42", 0.5, 0.1));

        assertThat(service.fingerprintCode(lines, "V4043V4242"))
                .isEqualTo(DocumentOcrService.FingerprintCheck.MATCH);
    }

    @Test
    @DisplayName("distingue un código distinto de uno ilegible")
    void reportsMismatchAndMissingCode() {
        assertThat(service.fingerprintCode(oldBack(), "E3333I2222"))
                .isEqualTo(DocumentOcrService.FingerprintCheck.MISMATCH);
        assertThat(service.fingerprintCode(List.of(line("ESTADO CIVIL SOLTERO", 0.1, 0.1)), "V4443V4442"))
                .isEqualTo(DocumentOcrService.FingerprintCheck.NOT_FOUND);
    }

    @Test
    @DisplayName("normaliza el código escrito por el cliente y rechaza formatos inválidos")
    void normalizesTypedCode() {
        assertThat(DocumentOcrService.normalizeFingerprintCode(" v4443-v4442 ")).isEqualTo("V4443V4442");
        assertThat(DocumentOcrService.normalizeFingerprintCode("V444V4442")).isNull();
        assertThat(DocumentOcrService.normalizeFingerprintCode(null)).isNull();
    }

    /** Ejemplo de la especificación ICAO 9303, con ruido alrededor como el que deja Textract. */
    private static List<DocumentOcrService.Line> passport() {
        return List.of(
                line("PASAPORTE / PASSPORT", 0.30, 0.05),
                line("ERIKSSON", 0.40, 0.20),
                line("P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", 0.03, 0.82),
                line("L898902C36UTO7408122F1204159ZE184226B<<<<<10", 0.03, 0.90));
    }

    @Test
    @DisplayName("lee la MRZ del pasaporte con nombres, número y fechas")
    void readsPassportMrz() {
        DocumentOcrService.PassportData data = service.parsePassport(passport());

        assertThat(data.number()).isEqualTo("L898902C3");
        assertThat(data.nationality()).isEqualTo("UTO");
        assertThat(data.lastNames()).isEqualTo("ERIKSSON");
        assertThat(data.firstNames()).isEqualTo("ANNA MARIA");
        assertThat(data.birthDate()).isEqualTo(LocalDate.of(1974, 8, 12));
        assertThat(data.expiryDate()).isEqualTo(LocalDate.of(2012, 4, 15));
    }

    @Test
    @DisplayName("rechaza una MRZ cuyo dígito verificador no cuadra")
    void rejectsBadCheckDigit() {
        List<DocumentOcrService.Line> misread = List.of(
                line("L898902C35UTO7408122F1204159ZE184226B<<<<<10", 0.03, 0.90));

        assertThatThrownBy(() -> service.parsePassport(misread))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("con claridad");
    }

    @Test
    @DisplayName("avisa cuando la foto no muestra la MRZ")
    void failsWithoutMrz() {
        assertThatThrownBy(() -> service.parsePassport(List.of(line("PASAPORTE", 0.1, 0.1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("<<<");
    }

    @Test
    @DisplayName("avisa cuando no hay una cédula válida en la imagen")
    void failsWithoutId() {
        List<DocumentOcrService.Line> lines = List.of(
                line("REPÚBLICA DEL ECUADOR", 0.1, 0.1),
                line("1234567890", 0.1, 0.2));

        assertThatThrownBy(() -> service.parse(lines))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("número de cédula");
    }
}
