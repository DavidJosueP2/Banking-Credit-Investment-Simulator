package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.SeguroCreditoEntity;
import com.edu.uta.backend.dto.SeguroCreditoRequestDto;
import com.edu.uta.backend.dto.SeguroCreditoResponseDto;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.SeguroCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SeguroCreditoService {

    private final SeguroCreditoRepository repository;
    private final ProductoCreditoRepository productoRepository;

    @Transactional(readOnly = true)
    public List<SeguroCreditoResponseDto> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<SeguroCreditoResponseDto> findByProducto(Long productoId) {
        return repository.findAllByProductoId(productoId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public SeguroCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public SeguroCreditoResponseDto create(SeguroCreditoRequestDto dto) {
        ProductoCreditoEntity producto = productoRepository.findById(dto.productoId())
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + dto.productoId()));

        SeguroCreditoEntity e = new SeguroCreditoEntity();
        e.setProducto(producto);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public SeguroCreditoResponseDto update(Long id, SeguroCreditoRequestDto dto) {
        SeguroCreditoEntity e = getOrThrow(id);

        if (!e.getProducto().getId().equals(dto.productoId())) {
            ProductoCreditoEntity producto = productoRepository.findById(dto.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + dto.productoId()));
            e.setProducto(producto);
        }

        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public void toggleActivo(Long id) {
        SeguroCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private SeguroCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Seguro no encontrado: " + id));
    }

    private void applyDto(SeguroCreditoRequestDto dto, SeguroCreditoEntity e) {
        e.setNombre(dto.nombre());
        e.setTipoSeguro(dto.tipoSeguro());
        e.setValorPorcentaje(dto.valorPorcentaje());
        e.setObligatorio(dto.obligatorio() != null ? dto.obligatorio() : true);
        e.setDescripcion(dto.descripcion());
    }

    private SeguroCreditoResponseDto toDto(SeguroCreditoEntity e) {
        var prod = e.getProducto();
        return new SeguroCreditoResponseDto(
                e.getId(),
                prod.getId(),
                prod.getNombre(),
                e.getNombre(),
                e.getTipoSeguro(),
                e.getValorPorcentaje(),
                e.getObligatorio(),
                e.getDescripcion(),
                e.getActivo(),
                e.getCreadoEn()
        );
    }
}
