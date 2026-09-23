package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.CargoCreditoEntity;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.dto.CargoCreditoRequestDto;
import com.edu.uta.backend.dto.CargoCreditoResponseDto;
import com.edu.uta.backend.repository.CargoCreditoRepository;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CargoCreditoService {

    private final CargoCreditoRepository repository;
    private final ProductoCreditoRepository productoRepository;

    @Transactional(readOnly = true)
    public List<CargoCreditoResponseDto> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<CargoCreditoResponseDto> findByProducto(Long productoId) {
        return repository.findAllByProductoId(productoId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public CargoCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public CargoCreditoResponseDto create(CargoCreditoRequestDto dto) {
        ProductoCreditoEntity producto = productoRepository.findById(dto.productoId())
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + dto.productoId()));

        CargoCreditoEntity e = new CargoCreditoEntity();
        e.setProducto(producto);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public CargoCreditoResponseDto update(Long id, CargoCreditoRequestDto dto) {
        CargoCreditoEntity e = getOrThrow(id);

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
        CargoCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private CargoCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cargo no encontrado: " + id));
    }

    private void applyDto(CargoCreditoRequestDto dto, CargoCreditoEntity e) {
        e.setNombre(dto.nombre());
        e.setTipoCargo(dto.tipoCargo());
        e.setValor(dto.valor());
        e.setObligatorio(dto.obligatorio() != null ? dto.obligatorio() : true);
        e.setDescripcion(dto.descripcion());
    }

    private CargoCreditoResponseDto toDto(CargoCreditoEntity e) {
        var prod = e.getProducto();
        return new CargoCreditoResponseDto(
                e.getId(),
                prod.getId(),
                prod.getNombre(),
                e.getNombre(),
                e.getTipoCargo(),
                e.getValor(),
                e.getObligatorio(),
                e.getDescripcion(),
                e.getActivo(),
                e.getCreadoEn()
        );
    }
}
