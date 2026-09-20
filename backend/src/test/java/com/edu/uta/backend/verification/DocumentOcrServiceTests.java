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
