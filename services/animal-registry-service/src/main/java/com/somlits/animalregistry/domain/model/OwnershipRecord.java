package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ownership_record")
public class OwnershipRecord {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "transfer_reference", length = 100)
    private String transferReference;

    @Column(name = "transfer_notes")
    private String transferNotes;

    @Column(name = "recorded_by", nullable = false, updatable = false)
    private UUID recordedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static OwnershipRecord create(UUID animalId, UUID ownerId, UUID recordedBy) {
        var o = new OwnershipRecord();
        o.id = UUID.randomUUID();
        o.animalId = animalId;
        o.ownerId = ownerId;
        o.startedAt = Instant.now();
        o.recordedBy = recordedBy;
        o.createdAt = Instant.now();
        return o;
    }

    public void close(String reference, String notes) {
        this.endedAt = Instant.now();
        this.transferReference = reference;
        this.transferNotes = notes;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public UUID getOwnerId() { return ownerId; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public String getTransferReference() { return transferReference; }
    public String getTransferNotes() { return transferNotes; }
    public UUID getRecordedBy() { return recordedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isCurrent() { return endedAt == null; }
}
