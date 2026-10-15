package com.somlits.movementtracking.api.v1.dto.response;

import com.somlits.movementtracking.domain.model.MovementAnimal;

import java.time.Instant;
import java.util.UUID;

public class MovementAnimalResponse {

    private UUID id;
    private UUID movementId;
    private UUID animalId;
    private String animalCode;
    private String tagSerial;
    private String arrivedTagSerial;
    private String species;
    private String status;
    private String exceptionNotes;
    private Instant createdAt;
    private Instant updatedAt;

    public static MovementAnimalResponse from(MovementAnimal ma) {
        var r = new MovementAnimalResponse();
        r.id = ma.getId();
        r.movementId = ma.getMovementId();
        r.animalId = ma.getAnimalId();
        r.animalCode = ma.getAnimalCode();
        r.tagSerial = ma.getTagSerial();
        r.arrivedTagSerial = ma.getArrivedTagSerial();
        r.species = ma.getSpecies();
        r.status = ma.getStatus().name();
        r.exceptionNotes = ma.getExceptionNotes();
        r.createdAt = ma.getCreatedAt();
        r.updatedAt = ma.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getMovementId() { return movementId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getTagSerial() { return tagSerial; }
    public String getArrivedTagSerial() { return arrivedTagSerial; }
    public String getSpecies() { return species; }
    public String getStatus() { return status; }
    public String getExceptionNotes() { return exceptionNotes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
