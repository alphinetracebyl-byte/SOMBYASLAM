package com.somlits.quarantineexport.api.v1.dto.response;

import com.somlits.quarantineexport.domain.model.ExportClearance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class ExportClearanceResponse {

    private UUID id;
    private String clearanceCode;
    private UUID consignmentId;
    private UUID animalId;
    private LocalDate clearanceDate;
    private UUID issuedBy;
    private LocalDate validUntil;
    private String status;
    private UUID revokedBy;
    private Instant revokedAt;

    public static ExportClearanceResponse from(ExportClearance ec) {
        ExportClearanceResponse r = new ExportClearanceResponse();
        r.id = ec.getId();
        r.clearanceCode = ec.getClearanceCode();
        r.consignmentId = ec.getConsignmentId();
        r.animalId = ec.getAnimalId();
        r.clearanceDate = ec.getClearanceDate();
        r.issuedBy = ec.getIssuedBy();
        r.validUntil = ec.getValidUntil();
        r.status = ec.getStatus().name();
        r.revokedBy = ec.getRevokedBy();
        r.revokedAt = ec.getRevokedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getClearanceCode() { return clearanceCode; }
    public UUID getConsignmentId() { return consignmentId; }
    public UUID getAnimalId() { return animalId; }
    public LocalDate getClearanceDate() { return clearanceDate; }
    public UUID getIssuedBy() { return issuedBy; }
    public LocalDate getValidUntil() { return validUntil; }
    public String getStatus() { return status; }
    public UUID getRevokedBy() { return revokedBy; }
    public Instant getRevokedAt() { return revokedAt; }
}
