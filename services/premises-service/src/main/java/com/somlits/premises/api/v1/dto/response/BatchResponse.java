package com.somlits.premises.api.v1.dto.response;

import com.somlits.premises.domain.entity.AnimalBatch;

import java.time.Instant;
import java.util.UUID;

public class BatchResponse {

    private UUID id;
    private String batchCode;
    private UUID premisesId;
    private Integer registrationYear;
    private String status;
    private Integer animalCount;
    private String species;
    private UUID createdBy;
    private Instant createdAt;
    private UUID closedBy;
    private Instant closedAt;
    private String notes;

    public static BatchResponse from(AnimalBatch b) {
        var r = new BatchResponse();
        r.id = b.getId();
        r.batchCode = b.getBatchCode();
        r.premisesId = b.getPremisesId();
        r.registrationYear = b.getRegistrationYear();
        r.status = b.getStatus().name();
        r.animalCount = b.getAnimalCount();
        r.species = b.getSpecies();
        r.createdBy = b.getCreatedBy();
        r.createdAt = b.getCreatedAt();
        r.closedBy = b.getClosedBy();
        r.closedAt = b.getClosedAt();
        r.notes = b.getNotes();
        return r;
    }

    public UUID getId() { return id; }
    public String getBatchCode() { return batchCode; }
    public UUID getPremisesId() { return premisesId; }
    public Integer getRegistrationYear() { return registrationYear; }
    public String getStatus() { return status; }
    public Integer getAnimalCount() { return animalCount; }
    public String getSpecies() { return species; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getClosedBy() { return closedBy; }
    public Instant getClosedAt() { return closedAt; }
    public String getNotes() { return notes; }
}
