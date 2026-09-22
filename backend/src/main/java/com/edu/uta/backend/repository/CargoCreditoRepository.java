package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.CargoCreditoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CargoCreditoRepository extends JpaRepository<CargoCreditoEntity, Long> {
    List<CargoCreditoEntity> findAllByProductoIdAndActivoTrue(Long productoId);
    List<CargoCreditoEntity> findAllByProductoId(Long productoId);
}
