package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.SegmentoCreditoEntity;
import com.edu.uta.backend.dto.SegmentoCreditoRequestDto;
import com.edu.uta.backend.dto.SegmentoCreditoResponseDto;
import com.edu.uta.backend.repository.SegmentoCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SegmentoCreditoService {

    private final SegmentoCreditoRepository repository;

    @Transactional(readOnly = true)
    public List<SegmentoCreditoResponseDto> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<SegmentoCreditoResponseDto> findAllActivos() {
        return repository.findAllByActivoTrueOrderByOrdenAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public SegmentoCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public SegmentoCreditoResponseDto create(SegmentoCreditoRequestDto dto) {
        SegmentoCreditoEntity e = new SegmentoCreditoEntity();
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public SegmentoCreditoResponseDto update(Long id, SegmentoCreditoRequestDto dto) {
        SegmentoCreditoEntity e = getOrThrow(id);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public void toggleActivo(Long id) {
        SegmentoCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private SegmentoCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Segmento no encontrado: " + id));
    }

    private void applyDto(SegmentoCreditoRequestDto dto, SegmentoCreditoEntity e) {
        e.setCodigo(dto.codigo());
        e.setNombre(dto.nombre());
        e.setDescripcion(dto.descripcion());
        e.setOrden(dto.orden() != null ? dto.orden() : 0);
    }

    private SegmentoCreditoResponseDto toDto(SegmentoCreditoEntity e) {
        return new SegmentoCreditoResponseDto(
                e.getId(), e.getCodigo(), e.getNombre(), e.getDescripcion(),
                e.getOrden(), e.getActivo(), e.getCreadoEn(), e.getActualizadoEn()
        );
    }
}
