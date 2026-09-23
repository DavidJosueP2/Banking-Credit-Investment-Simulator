package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.SegmentoCreditoEntity;
import com.edu.uta.backend.domain.entity.TipoCreditoEntity;
import com.edu.uta.backend.dto.TipoCreditoRequestDto;
import com.edu.uta.backend.dto.TipoCreditoResponseDto;
import com.edu.uta.backend.repository.SegmentoCreditoRepository;
import com.edu.uta.backend.repository.TipoCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TipoCreditoService {

    private final TipoCreditoRepository repository;
    private final SegmentoCreditoRepository segmentoRepository;

    @Transactional(readOnly = true)
    public List<TipoCreditoResponseDto> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TipoCreditoResponseDto> findBySegmento(Long segmentoId) {
        return repository.findAllBySegmentoIdAndActivoTrueOrderByOrdenAsc(segmentoId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public TipoCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public TipoCreditoResponseDto create(TipoCreditoRequestDto dto) {
        SegmentoCreditoEntity segmento = segmentoRepository.findById(dto.segmentoId())
                .orElseThrow(() -> new EntityNotFoundException("Segmento no encontrado: " + dto.segmentoId()));
        TipoCreditoEntity e = new TipoCreditoEntity();
        e.setSegmento(segmento);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public TipoCreditoResponseDto update(Long id, TipoCreditoRequestDto dto) {
        TipoCreditoEntity e = getOrThrow(id);
        if (!e.getSegmento().getId().equals(dto.segmentoId())) {
            SegmentoCreditoEntity segmento = segmentoRepository.findById(dto.segmentoId())
                    .orElseThrow(() -> new EntityNotFoundException("Segmento no encontrado: " + dto.segmentoId()));
            e.setSegmento(segmento);
        }
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public void toggleActivo(Long id) {
        TipoCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private TipoCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tipo de crédito no encontrado: " + id));
    }

    private void applyDto(TipoCreditoRequestDto dto, TipoCreditoEntity e) {
        e.setNombre(dto.nombre());
        e.setDescripcion(dto.descripcion());
        e.setOrden(dto.orden() != null ? dto.orden() : 0);
    }

    private TipoCreditoResponseDto toDto(TipoCreditoEntity e) {
        return new TipoCreditoResponseDto(
                e.getId(),
                e.getSegmento().getId(),
                e.getSegmento().getNombre(),
                e.getSegmento().getCodigo(),
                e.getNombre(),
                e.getDescripcion(),
                e.getOrden(),
                e.getActivo(),
                e.getCreadoEn()
        );
    }
}
