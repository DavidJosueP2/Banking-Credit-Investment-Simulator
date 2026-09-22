package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.TipoCreditoEntity;
import com.edu.uta.backend.dto.ProductoCreditoRequestDto;
import com.edu.uta.backend.dto.ProductoCreditoResponseDto;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.TipoCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoCreditoService {

    private final ProductoCreditoRepository repository;
    private final TipoCreditoRepository tipoRepository;

    @Transactional(readOnly = true)
    public List<ProductoCreditoResponseDto> findAll() {
        return repository.findAllByActivoTrueOrderByOrdenAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductoCreditoResponseDto> findByTipo(Long tipoId) {
        return repository.findAllByTipoCreditoIdAndActivoTrueOrderByOrdenAsc(tipoId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ProductoCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public ProductoCreditoResponseDto create(ProductoCreditoRequestDto dto) {
        TipoCreditoEntity tipo = tipoRepository.findById(dto.tipoCreditoId())
                .orElseThrow(() -> new EntityNotFoundException("Tipo de crédito no encontrado: " + dto.tipoCreditoId()));
        ProductoCreditoEntity e = new ProductoCreditoEntity();
        e.setTipoCredito(tipo);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public ProductoCreditoResponseDto update(Long id, ProductoCreditoRequestDto dto) {
        ProductoCreditoEntity e = getOrThrow(id);
        if (!e.getTipoCredito().getId().equals(dto.tipoCreditoId())) {
            TipoCreditoEntity tipo = tipoRepository.findById(dto.tipoCreditoId())
                    .orElseThrow(() -> new EntityNotFoundException("Tipo no encontrado: " + dto.tipoCreditoId()));
            e.setTipoCredito(tipo);
        }
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public void toggleActivo(Long id) {
        ProductoCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private ProductoCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + id));
    }

    private void applyDto(ProductoCreditoRequestDto dto, ProductoCreditoEntity e) {
        e.setNombre(dto.nombre());
        e.setDescripcion(dto.descripcion());
        e.setPlazoMinMeses(dto.plazoMinMeses());
        e.setPlazoMaxMeses(dto.plazoMaxMeses());
        e.setMontoMin(dto.montoMin());
        e.setMontoMax(dto.montoMax());
        e.setRequiereGarante(dto.requiereGarante() != null && dto.requiereGarante());
        e.setImagenUrl(dto.imagenUrl());
        e.setOrden(dto.orden() != null ? dto.orden() : 0);
    }

    private ProductoCreditoResponseDto toDto(ProductoCreditoEntity e) {
        var tipo = e.getTipoCredito();
        var segmento = tipo.getSegmento();
        return new ProductoCreditoResponseDto(
                e.getId(), tipo.getId(), tipo.getNombre(),
                segmento.getId(), segmento.getNombre(),
                e.getNombre(), e.getDescripcion(),
                e.getPlazoMinMeses(), e.getPlazoMaxMeses(),
                e.getMontoMin(), e.getMontoMax(),
                e.getRequiereGarante(), e.getImagenUrl(),
                e.getOrden(), e.getActivo(), e.getCreadoEn()
        );
    }
}
