package com.somlits.movementtracking.api.v1.dto.response;

import com.somlits.movementtracking.domain.model.MovementCheckpoint;

import java.time.Instant;
import java.util.UUID;

public class MovementCheckpointResponse {

    private UUID id;
    private UUID movementId;
    private String checkpointName;
    private String checkpointRegion;
    private UUID officerId;
    private String officerName;
    private int animalsVerifiedCount;
    private boolean permitVerified;
    private boolean anomalyNoted;
    private String anomalyNotes;
    private boolean offlineRecorded;
    private Instant recordedAt;

    public static MovementCheckpointResponse from(MovementCheckpoint c) {
        var r = new MovementCheckpointResponse();
        r.id = c.getId();
        r.movementId = c.getMovementId();
        r.checkpointName = c.getCheckpointName();
        r.checkpointRegion = c.getCheckpointRegion();
        r.officerId = c.getOfficerId();
        r.officerName = c.getOfficerName();
        r.animalsVerifiedCount = c.getAnimalsVerifiedCount();
        r.permitVerified = c.isPermitVerified();
        r.anomalyNoted = c.isAnomalyNoted();
        r.anomalyNotes = c.getAnomalyNotes();
        r.offlineRecorded = c.isOfflineRecorded();
        r.recordedAt = c.getRecordedAt();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getMovementId() { return movementId; }
    public String getCheckpointName() { return checkpointName; }
    public String getCheckpointRegion() { return checkpointRegion; }
    public UUID getOfficerId() { return officerId; }
    public String getOfficerName() { return officerName; }
    public int getAnimalsVerifiedCount() { return animalsVerifiedCount; }
    public boolean isPermitVerified() { return permitVerified; }
    public boolean isAnomalyNoted() { return anomalyNoted; }
    public String getAnomalyNotes() { return anomalyNotes; }
    public boolean isOfflineRecorded() { return offlineRecorded; }
    public Instant getRecordedAt() { return recordedAt; }
}
