package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.SeguroCreditoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeguroCreditoRepository extends JpaRepository<SeguroCreditoEntity, Long> {
    List<SeguroCreditoEntity> findAllByProductoIdAndActivoTrue(Long productoId);
    List<SeguroCreditoEntity> findAllByProductoId(Long productoId);
}
