package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class StartQuarantineRequest {

    @NotNull(message = "quarantinePremisesId is required")
    private UUID quarantinePremisesId;

    @NotBlank(message = "quarantinePremisesCode is required")
    private String quarantinePremisesCode;

    public UUID getQuarantinePremisesId() { return quarantinePremisesId; }
    public void setQuarantinePremisesId(UUID quarantinePremisesId) { this.quarantinePremisesId = quarantinePremisesId; }

    public String getQuarantinePremisesCode() { return quarantinePremisesCode; }
    public void setQuarantinePremisesCode(String quarantinePremisesCode) { this.quarantinePremisesCode = quarantinePremisesCode; }
}
