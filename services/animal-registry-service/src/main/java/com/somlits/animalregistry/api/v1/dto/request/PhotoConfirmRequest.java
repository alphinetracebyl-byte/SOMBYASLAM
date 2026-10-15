package com.somlits.animalregistry.api.v1.dto.request;

import java.time.Instant;

public class PhotoConfirmRequest {
    private long fileSizeBytes;
    private Instant takenAt;
    private String caption;

    public long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(long v) { this.fileSizeBytes = v; }
    public Instant getTakenAt() { return takenAt; }
    public void setTakenAt(Instant v) { this.takenAt = v; }
    public String getCaption() { return caption; }
    public void setCaption(String v) { this.caption = v; }
}
