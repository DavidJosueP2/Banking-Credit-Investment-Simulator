package com.edu.uta.backend.registration;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {

    boolean existsByIdTypeAndIdNumber(String idType, String idNumber);

    Optional<CustomerProfile> findByUserId(Long userId);
}
