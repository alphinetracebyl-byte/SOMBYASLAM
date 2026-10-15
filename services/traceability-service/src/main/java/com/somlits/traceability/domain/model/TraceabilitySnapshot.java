package com.somlits.traceability.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "traceability_snapshot")
public class TraceabilitySnapshot {

    @Id
    private UUID id;

    @Column(name = "animal_id", nullable = false, unique = true)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 30)
    private String animalCode;

    @Column(name = "snapshot_generated_at", nullable = false)
    private Instant snapshotGeneratedAt;

    @Column(name = "trace_data", nullable = false, columnDefinition = "jsonb")
    private String traceData;

    protected TraceabilitySnapshot() {}

    public static TraceabilitySnapshot create(UUID animalId, String animalCode,
                                              Instant snapshotGeneratedAt, String traceData) {
        TraceabilitySnapshot s = new TraceabilitySnapshot();
        s.id = UUID.randomUUID();
        s.animalId = animalId;
        s.animalCode = animalCode;
        s.snapshotGeneratedAt = snapshotGeneratedAt;
        s.traceData = traceData;
        return s;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public Instant getSnapshotGeneratedAt() { return snapshotGeneratedAt; }
    public String getTraceData() { return traceData; }

    public void updateTraceData(String traceData, Instant snapshotGeneratedAt) {
        this.traceData = traceData;
        this.snapshotGeneratedAt = snapshotGeneratedAt;
    }
}
