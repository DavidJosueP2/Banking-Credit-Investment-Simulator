package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.InstitutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InstitutionRepository extends JpaRepository<InstitutionEntity, Long> {
    Optional<InstitutionEntity> findFirstByActivoTrue();
}
