package com.somlits.premises.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public class CreateBatchRequest {

    private String species;

    private String notes;

    public String getSpecies() { return species; }
    public String getNotes() { return notes; }
}
