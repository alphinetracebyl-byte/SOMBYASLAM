package com.somlits.quarantineexport.domain.model;

import com.somlits.quarantineexport.domain.enums.ConsignmentAnimalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consignment_animal")
public class ConsignmentAnimal {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "consignment_id", nullable = false)
    private UUID consignmentId;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 30)
    private String animalCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ConsignmentAnimalStatus status;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    @Column(name = "added_by", nullable = false)
    private UUID addedBy;

    @Column(name = "cleared_at")
    private Instant clearedAt;

    @Column(name = "cleared_by")
    private UUID clearedBy;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "removed_at")
    private Instant removedAt;

    @Column(name = "removed_by")
    private UUID removedBy;

    @Column(name = "removal_reason")
    private String removalReason;

    protected ConsignmentAnimal() {
        // JPA
    }

    public static ConsignmentAnimal add(UUID consignmentId, UUID animalId, String animalCode, UUID addedBy) {
        ConsignmentAnimal ca = new ConsignmentAnimal();
        ca.id = UUID.randomUUID();
        ca.consignmentId = consignmentId;
        ca.animalId = animalId;
        ca.animalCode = animalCode;
        ca.status = ConsignmentAnimalStatus.INCLUDED;
        ca.addedAt = Instant.now();
        ca.addedBy = addedBy;
        return ca;
    }

    public void clear(UUID clearedBy) {
        this.status = ConsignmentAnimalStatus.CLEARED;
        this.clearedAt = Instant.now();
        this.clearedBy = clearedBy;
    }

    public void fail(String reason) {
        this.status = ConsignmentAnimalStatus.FAILED;
        this.failureReason = reason;
    }

    public void remove(UUID removedBy, String reason) {
        this.status = ConsignmentAnimalStatus.REMOVED;
        this.removedAt = Instant.now();
        this.removedBy = removedBy;
        this.removalReason = reason;
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public UUID getConsignmentId() { return consignmentId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public ConsignmentAnimalStatus getStatus() { return status; }
    public Instant getAddedAt() { return addedAt; }
    public UUID getAddedBy() { return addedBy; }
    public Instant getClearedAt() { return clearedAt; }
    public UUID getClearedBy() { return clearedBy; }
    public String getFailureReason() { return failureReason; }
    public Instant getRemovedAt() { return removedAt; }
    public UUID getRemovedBy() { return removedBy; }
    public String getRemovalReason() { return removalReason; }
}
