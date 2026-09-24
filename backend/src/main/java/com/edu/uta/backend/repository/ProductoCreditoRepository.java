package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.ProductoCreditoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductoCreditoRepository extends JpaRepository<ProductoCreditoEntity, Long> {
    List<ProductoCreditoEntity> findAllByTipoCreditoIdAndActivoTrueOrderByOrdenAsc(Long tipoCreditoId);
    List<ProductoCreditoEntity> findAllByActivoTrueOrderByOrdenAsc();
    List<ProductoCreditoEntity> findAllByActivoTrueOrderByIdDesc();
    List<ProductoCreditoEntity> findAllByOrderByIdDesc();
    List<ProductoCreditoEntity> findAllByActivoTrue();
}
