package com.somlits.animalregistry.api.v1.dto.response;

import java.time.Instant;
import java.util.UUID;

public class PhotoUploadUrlResponse {
    private UUID photoId;
    private String uploadUrl;
    private Instant expiresAt;
    private long maxFileSizeBytes;

    public PhotoUploadUrlResponse(UUID photoId, String uploadUrl, Instant expiresAt, long maxFileSizeBytes) {
        this.photoId = photoId;
        this.uploadUrl = uploadUrl;
        this.expiresAt = expiresAt;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public UUID getPhotoId() { return photoId; }
    public String getUploadUrl() { return uploadUrl; }
    public Instant getExpiresAt() { return expiresAt; }
    public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
}
