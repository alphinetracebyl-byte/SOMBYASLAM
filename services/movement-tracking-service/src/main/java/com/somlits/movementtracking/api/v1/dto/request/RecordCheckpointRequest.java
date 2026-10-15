package com.somlits.movementtracking.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class RecordCheckpointRequest {

    @NotNull
    private UUID officerId;

    @NotBlank
    @Size(max = 150)
    private String officerName;

    @NotBlank
    @Size(max = 150)
    private String checkpointName;

    @Size(max = 60)
    private String checkpointRegion;

    private int animalsVerifiedCount;
    private boolean permitVerified;
    private boolean anomalyNoted;

    @Size(max = 500)
    private String anomalyNotes;

    private boolean offline;

    public UUID getOfficerId() { return officerId; }
    public void setOfficerId(UUID v) { this.officerId = v; }
    public String getOfficerName() { return officerName; }
    public void setOfficerName(String v) { this.officerName = v; }
    public String getCheckpointName() { return checkpointName; }
    public void setCheckpointName(String v) { this.checkpointName = v; }
    public String getCheckpointRegion() { return checkpointRegion; }
    public void setCheckpointRegion(String v) { this.checkpointRegion = v; }
    public int getAnimalsVerifiedCount() { return animalsVerifiedCount; }
    public void setAnimalsVerifiedCount(int v) { this.animalsVerifiedCount = v; }
    public boolean isPermitVerified() { return permitVerified; }
    public void setPermitVerified(boolean v) { this.permitVerified = v; }
    public boolean isAnomalyNoted() { return anomalyNoted; }
    public void setAnomalyNoted(boolean v) { this.anomalyNoted = v; }
    public String getAnomalyNotes() { return anomalyNotes; }
    public void setAnomalyNotes(String v) { this.anomalyNotes = v; }
    public boolean isOffline() { return offline; }
    public void setOffline(boolean v) { this.offline = v; }
}
