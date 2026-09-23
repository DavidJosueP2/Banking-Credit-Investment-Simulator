package com.edu.uta.backend.verification;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerBiometricRepository extends JpaRepository<CustomerBiometric, Long> {

    Optional<CustomerBiometric> findByUserId(Long userId);
}
