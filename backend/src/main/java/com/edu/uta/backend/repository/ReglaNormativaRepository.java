package com.edu.uta.backend.repository;

import com.edu.uta.backend.domain.entity.ReglaNormativaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReglaNormativaRepository extends JpaRepository<ReglaNormativaEntity, Long> {

    @Query("""
        SELECT r FROM ReglaNormativaEntity r
        WHERE r.activo = true
          AND r.segmento = :segmento
          AND r.tipoParametro = :tipoParametro
          AND r.fechaInicioVigencia <= :fecha
          AND (r.fechaFinVigencia IS NULL OR r.fechaFinVigencia >= :fecha)
        ORDER BY r.fechaInicioVigencia DESC
    """)
    List<ReglaNormativaEntity> findReglasVigentes(
            @Param("segmento") String segmento,
            @Param("tipoParametro") String tipoParametro,
            @Param("fecha") LocalDate fecha
    );

    default Optional<ReglaNormativaEntity> findReglaVigente(String segmento, String tipoParametro, LocalDate fecha) {
        List<ReglaNormativaEntity> list = findReglasVigentes(segmento, tipoParametro, fecha);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("""
        SELECT r FROM ReglaNormativaEntity r
        WHERE r.activo = true
          AND r.fechaInicioVigencia <= :fecha
          AND (r.fechaFinVigencia IS NULL OR r.fechaFinVigencia >= :fecha)
        ORDER BY r.segmento ASC, r.tipoParametro ASC
    """)
    List<ReglaNormativaEntity> findAllVigentes(@Param("fecha") LocalDate fecha);
}
