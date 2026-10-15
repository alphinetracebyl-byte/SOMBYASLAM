package com.somlits.premises.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public class BatchOperationRequest {

    @NotBlank
    private String operationType;

    private String notes;

    private String details;

    public String getOperationType() { return operationType; }
    public String getNotes() { return notes; }
    public String getDetails() { return details; }
}
