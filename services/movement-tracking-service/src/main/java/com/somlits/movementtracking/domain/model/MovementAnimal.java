package com.somlits.movementtracking.domain.model;

import com.somlits.movementtracking.domain.enums.MovementAnimalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_animal")
public class MovementAnimal {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "movement_id", nullable = false, updatable = false)
    private UUID movementId;

    @Column(name = "animal_id", nullable = false, updatable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 25, updatable = false)
    private String animalCode;

    @Column(name = "tag_serial", length = 50, updatable = false)
    private String tagSerial;

    @Column(name = "species", nullable = false, length = 30, updatable = false)
    private String species;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private MovementAnimalStatus status = MovementAnimalStatus.SELECTED;

    @Column(name = "exception_notes", length = 400)
    private String exceptionNotes;

    @Column(name = "arrived_tag_serial", length = 50)
    private String arrivedTagSerial;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static MovementAnimal of(UUID movementId, UUID animalId, String animalCode,
                                     String tagSerial, String species) {
        var ma = new MovementAnimal();
        ma.id = UUID.randomUUID();
        ma.movementId = movementId;
        ma.animalId = animalId;
        ma.animalCode = animalCode;
        ma.tagSerial = tagSerial;
        ma.species = species;
        ma.status = MovementAnimalStatus.SELECTED;
        ma.createdAt = Instant.now();
        ma.updatedAt = Instant.now();
        return ma;
    }

    public void markDeparted() {
        this.status = MovementAnimalStatus.DEPARTED;
        this.updatedAt = Instant.now();
    }

    public void markArrived(String arrivedTagSerial) {
        this.status = MovementAnimalStatus.ARRIVED;
        this.arrivedTagSerial = arrivedTagSerial;
        this.updatedAt = Instant.now();
    }

    public void markMissing(String notes) {
        this.status = MovementAnimalStatus.MISSING;
        this.exceptionNotes = notes;
        this.updatedAt = Instant.now();
    }

    public void markDeadInTransit(String notes) {
        this.status = MovementAnimalStatus.DEAD_IN_TRANSIT;
        this.exceptionNotes = notes;
        this.updatedAt = Instant.now();
    }

    public void markRejectedAtDestination(String notes) {
        this.status = MovementAnimalStatus.REJECTED_AT_DESTINATION;
        this.exceptionNotes = notes;
        this.updatedAt = Instant.now();
    }

    public void markReturned() {
        this.status = MovementAnimalStatus.RETURNED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getMovementId() { return movementId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getTagSerial() { return tagSerial; }
    public String getSpecies() { return species; }
    public MovementAnimalStatus getStatus() { return status; }
    public String getExceptionNotes() { return exceptionNotes; }
    public String getArrivedTagSerial() { return arrivedTagSerial; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
