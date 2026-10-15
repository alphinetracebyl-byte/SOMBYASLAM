package com.somlits.movementtracking.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_checkpoint")
public class MovementCheckpoint {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "movement_id", nullable = false, updatable = false)
    private UUID movementId;

    @Column(name = "checkpoint_name", nullable = false, length = 150)
    private String checkpointName;

    @Column(name = "checkpoint_region", length = 60)
    private String checkpointRegion;

    @Column(name = "officer_id", nullable = false)
    private UUID officerId;

    @Column(name = "officer_name", nullable = false, length = 150)
    private String officerName;

    @Column(name = "animals_verified_count", nullable = false)
    private int animalsVerifiedCount;

    @Column(name = "permit_verified", nullable = false)
    private boolean permitVerified;

    @Column(name = "anomaly_noted", nullable = false)
    private boolean anomalyNoted = false;

    @Column(name = "anomaly_notes", length = 400)
    private String anomalyNotes;

    @Column(name = "offline_recorded", nullable = false)
    private boolean offlineRecorded = false;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    public static MovementCheckpoint of(UUID movementId, String checkpointName,
                                         String checkpointRegion, UUID officerId, String officerName,
                                         int animalsVerifiedCount, boolean permitVerified,
                                         boolean anomalyNoted, String anomalyNotes,
                                         boolean offlineRecorded) {
        var c = new MovementCheckpoint();
        c.id = UUID.randomUUID();
        c.movementId = movementId;
        c.checkpointName = checkpointName;
        c.checkpointRegion = checkpointRegion;
        c.officerId = officerId;
        c.officerName = officerName;
        c.animalsVerifiedCount = animalsVerifiedCount;
        c.permitVerified = permitVerified;
        c.anomalyNoted = anomalyNoted;
        c.anomalyNotes = anomalyNotes;
        c.offlineRecorded = offlineRecorded;
        c.recordedAt = Instant.now();
        return c;
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
