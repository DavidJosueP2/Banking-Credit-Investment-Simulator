package com.edu.uta.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record InstitutionRequestDto(
        @Size(max = 200) String nombre,
        @Size(max = 200) String nombreComercial,
        @Size(max = 13)  String ruc,
        String logoUrl,
        @Size(max = 500) String direccion,
        @Size(max = 50)  String telefono,
        @Email @Size(max = 150) String email,
        @Size(max = 300) String sitioWeb,
        @Size(max = 100) String ciudad,
        @Size(max = 100) String provincia,
        String descripcion,
        String horarios,
        @Size(max = 20) String colorPrimario,
        @Size(max = 20) String colorSecundario,
        String infoLegal,
        String terminosCondiciones,
        String politicaPrivacidad
) {}
