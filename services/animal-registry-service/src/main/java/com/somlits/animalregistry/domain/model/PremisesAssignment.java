package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "premises_assignment")
public class PremisesAssignment {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "premises_id", nullable = false)
    private UUID premisesId;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "reason")
    private String reason;

    @Column(name = "recorded_by", nullable = false, updatable = false)
    private UUID recordedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static PremisesAssignment create(UUID animalId, UUID premisesId, UUID recordedBy) {
        var p = new PremisesAssignment();
        p.id = UUID.randomUUID();
        p.animalId = animalId;
        p.premisesId = premisesId;
        p.startedAt = Instant.now();
        p.recordedBy = recordedBy;
        p.createdAt = Instant.now();
        return p;
    }

    public void close(String reason) {
        this.endedAt = Instant.now();
        this.reason = reason;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public UUID getPremisesId() { return premisesId; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public String getReason() { return reason; }
    public UUID getRecordedBy() { return recordedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isCurrent() { return endedAt == null; }
}
