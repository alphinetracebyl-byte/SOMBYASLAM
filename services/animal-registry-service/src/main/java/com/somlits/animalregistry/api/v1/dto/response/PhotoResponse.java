package com.somlits.animalregistry.api.v1.dto.response;

import com.somlits.animalregistry.domain.model.AnimalPhoto;

import java.time.Instant;
import java.util.UUID;

public class PhotoResponse {
    private UUID id;
    private UUID animalId;
    private String photoType;
    private String status;
    private String blobUrl;
    private Long fileSizeBytes;
    private String contentType;
    private Instant takenAt;
    private String caption;
    private Instant uploadedAt;
    private Instant confirmedAt;

    public static PhotoResponse from(AnimalPhoto p) {
        var r = new PhotoResponse();
        r.id = p.getId();
        r.animalId = p.getAnimalId();
        r.photoType = p.getPhotoType().name();
        r.status = p.getStatus().name();
        r.blobUrl = p.getBlobUrl();
        r.fileSizeBytes = p.getFileSizeBytes();
        r.contentType = p.getContentType();
        r.takenAt = p.getTakenAt();
        r.caption = p.getCaption();
        r.uploadedAt = p.getUploadedAt();
        r.confirmedAt = p.getConfirmedAt();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public String getPhotoType() { return photoType; }
    public String getStatus() { return status; }
    public String getBlobUrl() { return blobUrl; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public String getContentType() { return contentType; }
    public Instant getTakenAt() { return takenAt; }
    public String getCaption() { return caption; }
    public Instant getUploadedAt() { return uploadedAt; }
    public Instant getConfirmedAt() { return confirmedAt; }
}
