package com.edu.uta.backend.verification;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "identity_documents")
public class IdentityDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "document_side", nullable = false, length = 10)
    private String documentSide;

    @Column(name = "content_type", nullable = false, length = 80)
    private String contentType;

    @Column(nullable = false)
    private byte[] content;

    @Column(nullable = false, length = 12)
    private String status = "PENDING";

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    protected IdentityDocument() {
    }

    public IdentityDocument(Long userId, String documentSide, String contentType, byte[] content) {
        this.userId = userId;
        this.documentSide = documentSide;
        this.contentType = contentType;
        this.content = content;
    }

    @PrePersist
    void onCreate() {
        this.uploadedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getDocumentSide() {
        return documentSide;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getContent() {
        return content;
    }

    public String getStatus() {
        return status;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void replaceContent(String contentType, byte[] content) {
        this.contentType = contentType;
        this.content = content;
        this.uploadedAt = Instant.now();
    }

    public void markStatus(String status) {
        this.status = status;
    }
}
