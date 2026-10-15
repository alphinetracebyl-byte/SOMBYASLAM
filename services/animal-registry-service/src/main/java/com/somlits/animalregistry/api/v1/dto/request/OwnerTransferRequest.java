package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public class OwnerTransferRequest {
    @NotNull
    private UUID newOwnerId;
    @NotNull
    private UUID newPremisesId;
    private LocalDate transferDate;
    private String transferReference;
    private String notes;

    public UUID getNewOwnerId() { return newOwnerId; }
    public void setNewOwnerId(UUID v) { this.newOwnerId = v; }
    public UUID getNewPremisesId() { return newPremisesId; }
    public void setNewPremisesId(UUID v) { this.newPremisesId = v; }
    public LocalDate getTransferDate() { return transferDate; }
    public void setTransferDate(LocalDate v) { this.transferDate = v; }
    public String getTransferReference() { return transferReference; }
    public void setTransferReference(String v) { this.transferReference = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
}
