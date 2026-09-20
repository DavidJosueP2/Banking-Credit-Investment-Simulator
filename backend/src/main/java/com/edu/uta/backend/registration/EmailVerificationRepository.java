package com.edu.uta.backend.registration;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findFirstByUserIdOrderByIdDesc(Long userId);

    boolean existsByUserIdAndVerifiedAtIsNotNull(Long userId);
}
