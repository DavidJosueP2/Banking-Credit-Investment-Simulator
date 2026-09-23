package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.SegmentoCreditoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SegmentoCreditoRepository extends JpaRepository<SegmentoCreditoEntity, Long> {
    List<SegmentoCreditoEntity> findAllByActivoTrueOrderByOrdenAsc();
    boolean existsByCodigo(String codigo);
    java.util.Optional<SegmentoCreditoEntity> findByCodigo(String codigo);
}
