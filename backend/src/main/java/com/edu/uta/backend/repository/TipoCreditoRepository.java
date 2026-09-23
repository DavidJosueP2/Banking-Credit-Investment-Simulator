package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.TipoCreditoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TipoCreditoRepository extends JpaRepository<TipoCreditoEntity, Long> {
    List<TipoCreditoEntity> findAllBySegmentoIdAndActivoTrueOrderByOrdenAsc(Long segmentoId);
    List<TipoCreditoEntity> findAllByActivoTrueOrderBySegmentoOrdenAscOrdenAsc();
}
