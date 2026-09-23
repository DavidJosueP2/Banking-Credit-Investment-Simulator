package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.FuenteTasaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FuenteTasaRepository extends JpaRepository<FuenteTasaEntity, Long> {
    List<FuenteTasaEntity> findAllByActivoTrue();
    Optional<FuenteTasaEntity> findByCodigo(String codigo);
}
