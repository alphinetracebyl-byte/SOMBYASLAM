package com.somlits.animalregistry.domain.model;

import com.somlits.animalregistry.domain.enums.PhotoStatus;
import com.somlits.animalregistry.domain.enums.PhotoType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "animal_photo")
public class AnimalPhoto {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "photo_type", nullable = false, length = 30)
    private PhotoType photoType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PhotoStatus status = PhotoStatus.PENDING_UPLOAD;

    @Column(name = "blob_path", nullable = false, length = 500)
    private String blobPath;

    @Column(name = "blob_url", nullable = false, length = 500)
    private String blobUrl;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "taken_at")
    private Instant takenAt;

    @Column(name = "caption", length = 250)
    private String caption;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "removed_by")
    private UUID removedBy;

    @Column(name = "removal_reason")
    private String removalReason;

    @Column(name = "reference_event_id")
    private UUID referenceEventId;

    public static AnimalPhoto pending(UUID animalId, PhotoType photoType, String blobPath,
                                     String blobUrl, String contentType, UUID uploadedBy) {
        var p = new AnimalPhoto();
        p.id = UUID.randomUUID();
        p.animalId = animalId;
        p.photoType = photoType;
        p.status = PhotoStatus.PENDING_UPLOAD;
        p.blobPath = blobPath;
        p.blobUrl = blobUrl;
        p.contentType = contentType;
        p.uploadedBy = uploadedBy;
        p.uploadedAt = Instant.now();
        return p;
    }

    public void confirm(long fileSizeBytes, Instant takenAt) {
        this.status = PhotoStatus.ACTIVE;
        this.fileSizeBytes = fileSizeBytes;
        this.takenAt = takenAt;
        this.confirmedAt = Instant.now();
    }

    public void supersede() {
        this.status = PhotoStatus.SUPERSEDED;
    }

    public void remove(UUID removedBy, String reason) {
        this.status = PhotoStatus.REMOVED;
        this.removedBy = removedBy;
        this.removalReason = reason;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public PhotoType getPhotoType() { return photoType; }
    public PhotoStatus getStatus() { return status; }
    public String getBlobPath() { return blobPath; }
    public String getBlobUrl() { return blobUrl; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public String getContentType() { return contentType; }
    public Instant getTakenAt() { return takenAt; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public UUID getUploadedBy() { return uploadedBy; }
    public Instant getUploadedAt() { return uploadedAt; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public UUID getRemovedBy() { return removedBy; }
    public String getRemovalReason() { return removalReason; }
    public UUID getReferenceEventId() { return referenceEventId; }
    public void setReferenceEventId(UUID id) { this.referenceEventId = id; }
}
