package com.somlits.quarantineexport.api.v1.dto.response;

import com.somlits.quarantineexport.domain.model.ConsignmentAnimal;

import java.time.Instant;
import java.util.UUID;

public class ConsignmentAnimalResponse {

    private UUID id;
    private UUID consignmentId;
    private UUID animalId;
    private String animalCode;
    private String status;
    private Instant addedAt;
    private UUID addedBy;
    private Instant clearedAt;
    private UUID clearedBy;
    private String failureReason;
    private Instant removedAt;
    private UUID removedBy;
    private String removalReason;

    public static ConsignmentAnimalResponse from(ConsignmentAnimal ca) {
        ConsignmentAnimalResponse r = new ConsignmentAnimalResponse();
        r.id = ca.getId();
        r.consignmentId = ca.getConsignmentId();
        r.animalId = ca.getAnimalId();
        r.animalCode = ca.getAnimalCode();
        r.status = ca.getStatus().name();
        r.addedAt = ca.getAddedAt();
        r.addedBy = ca.getAddedBy();
        r.clearedAt = ca.getClearedAt();
        r.clearedBy = ca.getClearedBy();
        r.failureReason = ca.getFailureReason();
        r.removedAt = ca.getRemovedAt();
        r.removedBy = ca.getRemovedBy();
        r.removalReason = ca.getRemovalReason();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getConsignmentId() { return consignmentId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getStatus() { return status; }
    public Instant getAddedAt() { return addedAt; }
    public UUID getAddedBy() { return addedBy; }
    public Instant getClearedAt() { return clearedAt; }
    public UUID getClearedBy() { return clearedBy; }
    public String getFailureReason() { return failureReason; }
    public Instant getRemovedAt() { return removedAt; }
    public UUID getRemovedBy() { return removedBy; }
    public String getRemovalReason() { return removalReason; }
}
