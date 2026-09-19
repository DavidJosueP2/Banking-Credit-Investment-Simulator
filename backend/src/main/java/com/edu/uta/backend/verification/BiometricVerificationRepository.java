package com.edu.uta.backend.verification;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BiometricVerificationRepository extends JpaRepository<BiometricVerification, Long> {

    List<BiometricVerification> findTop10ByUserIdOrderByIdDesc(Long userId);
}
