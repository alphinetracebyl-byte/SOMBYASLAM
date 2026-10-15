package com.somlits.movementtracking.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RecordIllegalMovementRequest {

    @NotBlank
    @Size(max = 500)
    private String notes;

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
}
