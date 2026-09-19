package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.InstitutionEntity;
import com.edu.uta.backend.dto.InstitutionRequestDto;
import com.edu.uta.backend.dto.InstitutionResponseDto;
import com.edu.uta.backend.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InstitutionService {

    private final InstitutionRepository repository;

    @Transactional(readOnly = true)
    public Optional<InstitutionResponseDto> getActiveInstitution() {
        return repository.findFirstByActivoTrue().map(this::toDto);
    }

    @Transactional
    public InstitutionResponseDto upsert(InstitutionRequestDto dto) {
        InstitutionEntity entity = repository.findFirstByActivoTrue()
                .orElseGet(InstitutionEntity::new);
        applyDto(dto, entity);
        entity.setActivo(true);
        return toDto(repository.save(entity));
    }

    @Transactional
    public InstitutionResponseDto updateLogo(String logoUrl) {
        InstitutionEntity entity = repository.findFirstByActivoTrue()
                .orElseThrow(() -> new IllegalStateException("No existe configuración de institución"));
        entity.setLogoUrl(logoUrl);
        return toDto(repository.save(entity));
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private void applyDto(InstitutionRequestDto dto, InstitutionEntity e) {
        if (dto.nombre()              != null) e.setNombre(dto.nombre());
        if (dto.nombreComercial()     != null) e.setNombreComercial(dto.nombreComercial());
        if (dto.ruc()                 != null) e.setRuc(dto.ruc());
        if (dto.logoUrl()             != null) e.setLogoUrl(dto.logoUrl());
        if (dto.direccion()           != null) e.setDireccion(dto.direccion());
        if (dto.telefono()            != null) e.setTelefono(dto.telefono());
        if (dto.email()               != null) e.setEmail(dto.email());
        if (dto.sitioWeb()            != null) e.setSitioWeb(dto.sitioWeb());
        if (dto.ciudad()              != null) e.setCiudad(dto.ciudad());
        if (dto.provincia()           != null) e.setProvincia(dto.provincia());
        if (dto.descripcion()         != null) e.setDescripcion(dto.descripcion());
        if (dto.horarios()            != null) e.setHorarios(dto.horarios());
        if (dto.colorPrimario()       != null) e.setColorPrimario(dto.colorPrimario());
        if (dto.colorSecundario()     != null) e.setColorSecundario(dto.colorSecundario());
        if (dto.infoLegal()           != null) e.setInfoLegal(dto.infoLegal());
        if (dto.terminosCondiciones() != null) e.setTerminosCondiciones(dto.terminosCondiciones());
        if (dto.politicaPrivacidad()  != null) e.setPoliticaPrivacidad(dto.politicaPrivacidad());
    }

    private InstitutionResponseDto toDto(InstitutionEntity e) {
        return new InstitutionResponseDto(
                e.getId(), e.getNombre(), e.getNombreComercial(), e.getRuc(),
                e.getLogoUrl(), e.getDireccion(), e.getTelefono(), e.getEmail(),
                e.getSitioWeb(), e.getCiudad(), e.getProvincia(), e.getDescripcion(),
                e.getHorarios(), e.getColorPrimario(), e.getColorSecundario(),
                e.getInfoLegal(), e.getTerminosCondiciones(), e.getPoliticaPrivacidad(),
                e.getActivo(), e.getActualizadoEn()
        );
    }
}
