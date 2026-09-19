package com.edu.uta.backend.verification;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Referencia a la plantilla biométrica: el vector vive en la colección de Rekognition, nunca aquí. */
@Entity
@Table(name = "customer_biometrics")
public class CustomerBiometric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "collection_id", nullable = false, length = 60)
    private String collectionId;

    @Column(name = "face_id", nullable = false, length = 60)
    private String faceId;

    @Column(nullable = false, length = 40)
    private String algorithm;

    @Column(name = "enrolled_at", nullable = false)
    private Instant enrolledAt;

    @Column(name = "consent_at", nullable = false)
    private Instant consentAt;

    @Column(name = "consent_version", nullable = false, length = 20)
    private String consentVersion;

    protected CustomerBiometric() {
    }

    public CustomerBiometric(Long userId, String collectionId, String faceId, String algorithm,
                             Instant consentAt, String consentVersion) {
        this.userId = userId;
        this.collectionId = collectionId;
        this.faceId = faceId;
        this.algorithm = algorithm;
        this.consentAt = consentAt;
        this.consentVersion = consentVersion;
    }

    @PrePersist
    void onCreate() {
        this.enrolledAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getCollectionId() {
        return collectionId;
    }

    public String getFaceId() {
        return faceId;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    public Instant getEnrolledAt() {
        return enrolledAt;
    }

    public Instant getConsentAt() {
        return consentAt;
    }

    public String getConsentVersion() {
        return consentVersion;
    }

    public void replaceFace(String collectionId, String faceId, Instant consentAt, String consentVersion) {
        this.collectionId = collectionId;
        this.faceId = faceId;
        this.consentAt = consentAt;
        this.consentVersion = consentVersion;
        this.enrolledAt = Instant.now();
    }
}
