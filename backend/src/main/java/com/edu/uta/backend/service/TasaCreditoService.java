package com.edu.uta.backend.service;

import com.edu.uta.backend.domain.entity.FuenteTasaEntity;
import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.enums.TipoTasa;
import com.edu.uta.backend.dto.TasaCreditoRequestDto;
import com.edu.uta.backend.dto.TasaCreditoResponseDto;
import com.edu.uta.backend.repository.FuenteTasaRepository;
import com.edu.uta.backend.repository.ProductoCreditoRepository;
import com.edu.uta.backend.repository.TasaCreditoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TasaCreditoService {

    private final TasaCreditoRepository repository;
    private final ProductoCreditoRepository productoRepository;
    private final FuenteTasaRepository fuenteRepository;

    @Transactional(readOnly = true)
    public List<TasaCreditoResponseDto> findAll() {
        return repository.findAllByActivoTrueOrderByFechaVigenciaDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TasaCreditoResponseDto> findByProducto(Long productoId) {
        return repository.findAllByProductoIdAndActivoTrueOrderByFechaVigenciaDesc(productoId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TasaCreditoResponseDto> findByTipo(TipoTasa tipoTasa) {
        return repository.findAllByTipoTasaAndActivoTrueOrderByFechaVigenciaDesc(tipoTasa)
                .stream().map(this::toDto).toList();
    }

    /** Tasas globales (sin producto asociado) — útiles para el simulador */
    @Transactional(readOnly = true)
    public List<TasaCreditoResponseDto> findGlobales() {
        return repository.findAllByProductoIsNullAndActivoTrue().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public TasaCreditoResponseDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public TasaCreditoResponseDto create(TasaCreditoRequestDto dto) {
        TasaCreditoEntity e = new TasaCreditoEntity();
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public TasaCreditoResponseDto update(Long id, TasaCreditoRequestDto dto) {
        TasaCreditoEntity e = getOrThrow(id);
        applyDto(dto, e);
        return toDto(repository.save(e));
    }

    @Transactional
    public void toggleActivo(Long id) {
        TasaCreditoEntity e = getOrThrow(id);
        e.setActivo(!e.getActivo());
        repository.save(e);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private TasaCreditoEntity getOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tasa no encontrada: " + id));
    }

    private void applyDto(TasaCreditoRequestDto dto, TasaCreditoEntity e) {
        if (dto.productoId() != null) {
            ProductoCreditoEntity producto = productoRepository.findById(dto.productoId())
                    .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado: " + dto.productoId()));
            e.setProducto(producto);
        } else {
            e.setProducto(null);
        }
        if (dto.fuenteId() != null) {
            FuenteTasaEntity fuente = fuenteRepository.findById(dto.fuenteId())
                    .orElseThrow(() -> new EntityNotFoundException("Fuente no encontrada: " + dto.fuenteId()));
            e.setFuente(fuente);
        }
        e.setTipoTasa(dto.tipoTasa());
        e.setNombre(dto.nombre());
        e.setValor(dto.valor());
        e.setFechaVigencia(dto.fechaVigencia() != null ? dto.fechaVigencia() : LocalDate.now());
        e.setFechaFin(dto.fechaFin());
        e.setSegmentoBce(dto.segmentoBce());
        e.setInstitucionRef(dto.institucionRef());
        e.setObservacion(dto.observacion());
        e.setUrlFuente(dto.urlFuente());
    }

    private TasaCreditoResponseDto toDto(TasaCreditoEntity e) {
        return new TasaCreditoResponseDto(
                e.getId(),
                e.getProducto() != null ? e.getProducto().getId() : null,
                e.getProducto() != null ? e.getProducto().getNombre() : null,
                e.getFuente() != null ? e.getFuente().getId() : null,
                e.getFuente() != null ? e.getFuente().getNombre() : null,
                e.getFuente() != null ? e.getFuente().getCodigo() : null,
                e.getTipoTasa(),
                e.getNombre(),
                e.getValor(),
                e.getFechaVigencia(),
                e.getFechaFin(),
                e.getSegmentoBce(),
                e.getInstitucionRef(),
                e.getObservacion(),
                e.getUrlFuente(),
                e.getActivo(),
                e.getCreadoEn()
        );
    }
}
