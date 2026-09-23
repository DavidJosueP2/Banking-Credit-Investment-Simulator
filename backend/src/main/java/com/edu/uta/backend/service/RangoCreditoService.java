package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.RangoCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.dto.RangoCreditoRequestDto;
import com.edu.uta.backend.dto.RangoCreditoResponseDto;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.RangoCreditoRepository;
import com.edu.uta.backend.repository.TasaCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RangoCreditoService {

    private final RangoCreditoRepository repository;
    private final ProductoCreditoRepository productoRepository;
    private final TasaCreditoRepository tasaRepository;

    @Transactional(readOnly = true)
    public List<RangoCreditoResponseDto> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<RangoCreditoResponseDto> findByProducto(Long productoId) {
        return repository.findAllByProductoId(productoId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public RangoCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public RangoCreditoResponseDto create(RangoCreditoRequestDto dto) {
        ProductoCreditoEntity producto = productoRepository.findById(dto.productoId())
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + dto.productoId()));

        TasaCreditoEntity tasa = null;
        if (dto.tasaId() != null) {
            tasa = tasaRepository.findById(dto.tasaId())
                    .orElseThrow(() -> new EntityNotFoundException("Tasa no encontrada: " + dto.tasaId()));
        }

        RangoCreditoEntity e = new RangoCreditoEntity();
        e.setProducto(producto);
        e.setTasa(tasa);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public RangoCreditoResponseDto update(Long id, RangoCreditoRequestDto dto) {
        RangoCreditoEntity e = getOrThrow(id);

        if (!e.getProducto().getId().equals(dto.productoId())) {
            ProductoCreditoEntity producto = productoRepository.findById(dto.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + dto.productoId()));
            e.setProducto(producto);
        }

        if (dto.tasaId() != null) {
            if (e.getTasa() == null || !e.getTasa().getId().equals(dto.tasaId())) {
                TasaCreditoEntity tasa = tasaRepository.findById(dto.tasaId())
                        .orElseThrow(() -> new EntityNotFoundException("Tasa no encontrada: " + dto.tasaId()));
                e.setTasa(tasa);
            }
        } else {
            e.setTasa(null);
        }

        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public void toggleActivo(Long id) {
        RangoCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private RangoCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rango no encontrado: " + id));
    }

    private void applyDto(RangoCreditoRequestDto dto, RangoCreditoEntity e) {
        e.setMontoMin(dto.montoMin());
        e.setMontoMax(dto.montoMax());
        e.setPlazoMinMeses(dto.plazoMinMeses());
        e.setPlazoMaxMeses(dto.plazoMaxMeses());
        e.setDescripcion(dto.descripcion());
    }

    private RangoCreditoResponseDto toDto(RangoCreditoEntity e) {
        var prod = e.getProducto();
        var tasa = e.getTasa();
        return new RangoCreditoResponseDto(
                e.getId(),
                prod.getId(),
                prod.getNombre(),
                tasa != null ? tasa.getId() : null,
                tasa != null ? tasa.getValor() : null,
                tasa != null ? tasa.getNombre() : null,
                e.getMontoMin(),
                e.getMontoMax(),
                e.getPlazoMinMeses(),
                e.getPlazoMaxMeses(),
                e.getDescripcion(),
                e.getActivo(),
                e.getCreadoEn()
        );
    }
}
