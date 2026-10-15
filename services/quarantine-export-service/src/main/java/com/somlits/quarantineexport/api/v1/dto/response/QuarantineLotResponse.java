package com.somlits.quarantineexport.api.v1.dto.response;

import com.somlits.quarantineexport.domain.model.QuarantineLot;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class QuarantineLotResponse {

    private UUID id;
    private String lotCode;
    private UUID consignmentId;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private int requiredDays;
    private String testRequirements;
    private Boolean allTestsPassed;
    private UUID supervisingVetId;
    private String notes;
    private Instant createdAt;

    public static QuarantineLotResponse from(QuarantineLot lot) {
        QuarantineLotResponse r = new QuarantineLotResponse();
        r.id = lot.getId();
        r.lotCode = lot.getLotCode();
        r.consignmentId = lot.getConsignmentId();
        r.status = lot.getStatus().name();
        r.startDate = lot.getStartDate();
        r.endDate = lot.getEndDate();
        r.requiredDays = lot.getRequiredDays();
        r.testRequirements = lot.getTestRequirements();
        r.allTestsPassed = lot.getAllTestsPassed();
        r.supervisingVetId = lot.getSupervisingVetId();
        r.notes = lot.getNotes();
        r.createdAt = lot.getCreatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getLotCode() { return lotCode; }
    public UUID getConsignmentId() { return consignmentId; }
    public String getStatus() { return status; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public int getRequiredDays() { return requiredDays; }
    public String getTestRequirements() { return testRequirements; }
    public Boolean getAllTestsPassed() { return allTestsPassed; }
    public UUID getSupervisingVetId() { return supervisingVetId; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
