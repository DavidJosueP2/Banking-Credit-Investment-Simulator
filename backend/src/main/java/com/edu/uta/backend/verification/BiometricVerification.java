package com.edu.uta.backend.verification;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Resultado de una verificación biométrica, siempre atado a la operación que la pidió. */
@Entity
@Table(name = "biometric_verifications")
public class BiometricVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "operation_type", nullable = false, length = 40)
    private String operationType;

    @Column(name = "operation_id")
    private Long operationId;

    @Column(name = "session_id", length = 80)
    private String sessionId;

    @Column(name = "liveness_confidence", precision = 5, scale = 2)
    private BigDecimal livenessConfidence;

    @Column(name = "match_similarity", precision = 5, scale = 2)
    private BigDecimal matchSimilarity;

    @Column(nullable = false, length = 16)
    private String result;

    @Column(name = "verified_at", nullable = false)
    private Instant verifiedAt;

    protected BiometricVerification() {
    }

    public BiometricVerification(Long userId, String operationType, Long operationId, String sessionId,
                                 BigDecimal livenessConfidence, BigDecimal matchSimilarity, String result) {
        this.userId = userId;
        this.operationType = operationType;
        this.operationId = operationId;
        this.sessionId = sessionId;
        this.livenessConfidence = livenessConfidence;
        this.matchSimilarity = matchSimilarity;
        this.result = result;
    }

    @PrePersist
    void onCreate() {
        this.verifiedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getOperationType() {
        return operationType;
    }

    public Long getOperationId() {
        return operationId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public BigDecimal getLivenessConfidence() {
        return livenessConfidence;
    }

    public BigDecimal getMatchSimilarity() {
        return matchSimilarity;
    }

    public String getResult() {
        return result;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }
}
