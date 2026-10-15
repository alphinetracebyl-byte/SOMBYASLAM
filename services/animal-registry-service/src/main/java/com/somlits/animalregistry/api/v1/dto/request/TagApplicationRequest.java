package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public class TagApplicationRequest {
    @NotBlank
    private String tagSerial;
    @NotNull
    private UUID appliedBy;
    private Instant appliedAt;
    private String notes;

    public String getTagSerial() { return tagSerial; }
    public void setTagSerial(String v) { this.tagSerial = v; }
    public UUID getAppliedBy() { return appliedBy; }
    public void setAppliedBy(UUID v) { this.appliedBy = v; }
    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant v) { this.appliedAt = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
}
