package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.UsuarioEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<UsuarioEntity, Long> {
    Optional<UsuarioEntity> findByEmailAndActivoTrue(String email);
    Optional<UsuarioEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}
