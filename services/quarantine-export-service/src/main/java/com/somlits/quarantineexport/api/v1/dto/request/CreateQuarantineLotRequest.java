package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public class CreateQuarantineLotRequest {

    @NotNull(message = "consignmentId is required")
    private UUID consignmentId;

    @NotNull(message = "startDate is required")
    private LocalDate startDate;

    @Min(value = 1, message = "requiredDays must be at least 1")
    private int requiredDays;

    private UUID supervisingVetId;

    private String testRequirements;

    public UUID getConsignmentId() { return consignmentId; }
    public void setConsignmentId(UUID consignmentId) { this.consignmentId = consignmentId; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public int getRequiredDays() { return requiredDays; }
    public void setRequiredDays(int requiredDays) { this.requiredDays = requiredDays; }

    public UUID getSupervisingVetId() { return supervisingVetId; }
    public void setSupervisingVetId(UUID supervisingVetId) { this.supervisingVetId = supervisingVetId; }

    public String getTestRequirements() { return testRequirements; }
    public void setTestRequirements(String testRequirements) { this.testRequirements = testRequirements; }
}
