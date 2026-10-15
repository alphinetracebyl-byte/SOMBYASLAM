package com.somlits.ownerorg.domain.entity;

import com.somlits.ownerorg.domain.enums.DocumentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "owner_document")
public class OwnerDocument {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "file_name", nullable = false, length = 200)
    private String fileName;

    @Column(name = "blob_path", nullable = false, length = 500)
    private String blobPath;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DocumentStatus status;

    protected OwnerDocument() {
        // JPA
    }

    public static OwnerDocument create(UUID ownerId, String documentType, String fileName,
                                       String blobPath, UUID uploadedBy) {
        OwnerDocument d = new OwnerDocument();
        d.id = UUID.randomUUID();
        d.ownerId = ownerId;
        d.documentType = documentType;
        d.fileName = fileName;
        d.blobPath = blobPath;
        d.uploadedBy = uploadedBy;
        d.uploadedAt = Instant.now();
        d.status = DocumentStatus.PENDING_REVIEW;
        return d;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getDocumentType() { return documentType; }
    public String getFileName() { return fileName; }
    public String getBlobPath() { return blobPath; }
    public UUID getUploadedBy() { return uploadedBy; }
    public Instant getUploadedAt() { return uploadedAt; }
    public UUID getVerifiedBy() { return verifiedBy; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public DocumentStatus getStatus() { return status; }
}
