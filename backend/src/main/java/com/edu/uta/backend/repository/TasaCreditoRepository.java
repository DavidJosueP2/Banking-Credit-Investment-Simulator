package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.TasaCreditoEntity;
import com.edu.uta.backend.domain.enums.TipoTasa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TasaCreditoRepository extends JpaRepository<TasaCreditoEntity, Long> {
    List<TasaCreditoEntity> findAllByProductoIdAndActivoTrueOrderByFechaVigenciaDesc(Long productoId);
    List<TasaCreditoEntity> findAllByActivoTrueOrderByFechaVigenciaDesc();
    List<TasaCreditoEntity> findAllByTipoTasaAndActivoTrueOrderByFechaVigenciaDesc(TipoTasa tipoTasa);
    List<TasaCreditoEntity> findAllByProductoIsNullAndActivoTrue();
}
