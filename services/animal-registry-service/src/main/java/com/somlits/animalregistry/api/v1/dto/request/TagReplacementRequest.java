package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class TagReplacementRequest {
    @NotBlank
    private String reason; // LOST or DAMAGED
    @NotBlank
    private String newTagSerial;
    private boolean newTagSameNumber = false;
    private String replacementNotes;
    @NotNull
    private UUID replacedBy;

    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public String getNewTagSerial() { return newTagSerial; }
    public void setNewTagSerial(String v) { this.newTagSerial = v; }
    public boolean isNewTagSameNumber() { return newTagSameNumber; }
    public void setNewTagSameNumber(boolean v) { this.newTagSameNumber = v; }
    public String getReplacementNotes() { return replacementNotes; }
    public void setReplacementNotes(String v) { this.replacementNotes = v; }
    public UUID getReplacedBy() { return replacedBy; }
    public void setReplacedBy(UUID v) { this.replacedBy = v; }
}
