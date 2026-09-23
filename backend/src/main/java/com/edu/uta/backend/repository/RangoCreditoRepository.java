package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.RangoCreditoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RangoCreditoRepository extends JpaRepository<RangoCreditoEntity, Long> {
    List<RangoCreditoEntity> findAllByProductoIdAndActivoTrue(Long productoId);
    List<RangoCreditoEntity> findAllByProductoId(Long productoId);
}
