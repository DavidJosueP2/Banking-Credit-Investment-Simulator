package com.edu.uta.backend.verification;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface IdentityDocumentRepository extends JpaRepository<IdentityDocument, Long> {

    Optional<IdentityDocument> findByUserIdAndDocumentSide(Long userId, String documentSide);

    List<IdentityDocument> findByUserId(Long userId);
}
