package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public class IssueExportClearanceRequest {

    @NotNull(message = "consignmentId is required")
    private UUID consignmentId;

    private UUID animalId;

    @NotNull(message = "clearanceDate is required")
    private LocalDate clearanceDate;

    @NotNull(message = "validUntil is required")
    private LocalDate validUntil;

    public UUID getConsignmentId() { return consignmentId; }
    public void setConsignmentId(UUID consignmentId) { this.consignmentId = consignmentId; }

    public UUID getAnimalId() { return animalId; }
    public void setAnimalId(UUID animalId) { this.animalId = animalId; }

    public LocalDate getClearanceDate() { return clearanceDate; }
    public void setClearanceDate(LocalDate clearanceDate) { this.clearanceDate = clearanceDate; }

    public LocalDate getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }
}
