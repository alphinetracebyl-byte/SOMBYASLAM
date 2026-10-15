package com.somlits.markettrade.api.v1.dto.request;

import com.somlits.markettrade.domain.enums.VetInspectionStatus;
import jakarta.validation.constraints.NotNull;

public class VetInspectionRequest {

    @NotNull
    private VetInspectionStatus inspectionStatus;

    private String notes;

    public VetInspectionStatus getInspectionStatus() { return inspectionStatus; }
    public String getNotes() { return notes; }
}
