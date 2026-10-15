package com.somlits.premises.domain.entity;

import com.somlits.premises.domain.enums.BatchStatus;
import com.somlits.premises.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "animal_batch")
public class AnimalBatch {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "batch_code", nullable = false, unique = true, length = 40, updatable = false)
    private String batchCode;

    @Column(name = "premises_id", nullable = false, updatable = false)
    private UUID premisesId;

    @Column(name = "registration_year", nullable = false, updatable = false)
    private Integer registrationYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BatchStatus status = BatchStatus.OPEN;

    @Column(name = "animal_count", nullable = false)
    private Integer animalCount = 0;

    @Column(name = "species", length = 30)
    private String species;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "notes")
    private String notes;

    protected AnimalBatch() {}

    public static AnimalBatch open(UUID premisesId, String batchCode, int year,
                                   String species, UUID createdBy, String notes) {
        var b = new AnimalBatch();
        b.id = UUID.randomUUID();
        b.premisesId = premisesId;
        b.batchCode = batchCode;
        b.registrationYear = year;
        b.status = BatchStatus.OPEN;
        b.animalCount = 0;
        b.species = species;
        b.createdBy = createdBy;
        b.createdAt = Instant.now();
        b.notes = notes;
        return b;
    }

    public void incrementAnimalCount() {
        this.animalCount++;
    }

    public void close(UUID closedBy) {
        if (this.status == BatchStatus.CLOSED || this.status == BatchStatus.ARCHIVED) {
            throw new BusinessRuleViolationException("ERR-BAT-001",
                    "Batch is already " + this.status);
        }
        this.status = BatchStatus.CLOSED;
        this.closedBy = closedBy;
        this.closedAt = Instant.now();
    }

    public void archive() {
        if (this.status != BatchStatus.CLOSED) {
            throw new BusinessRuleViolationException("ERR-BAT-002",
                    "Only CLOSED batches can be archived (current: " + this.status + ")");
        }
        this.status = BatchStatus.ARCHIVED;
    }

    public boolean isOpen() { return this.status == BatchStatus.OPEN; }

    public UUID getId() { return id; }
    public String getBatchCode() { return batchCode; }
    public UUID getPremisesId() { return premisesId; }
    public Integer getRegistrationYear() { return registrationYear; }
    public BatchStatus getStatus() { return status; }
    public Integer getAnimalCount() { return animalCount; }
    public String getSpecies() { return species; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getClosedBy() { return closedBy; }
    public Instant getClosedAt() { return closedAt; }
    public String getNotes() { return notes; }

    void setBatchCode(String batchCode) { this.batchCode = batchCode; }
}
