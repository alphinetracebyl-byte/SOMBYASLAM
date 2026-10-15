package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class RegisterConsignmentRequest {

    @NotNull(message = "exporterOwnerId is required")
    private UUID exporterOwnerId;

    @NotBlank(message = "exporterOwnerCode is required")
    private String exporterOwnerCode;

    @NotBlank(message = "destinationCountry is required")
    private String destinationCountry;

    public UUID getExporterOwnerId() { return exporterOwnerId; }
    public void setExporterOwnerId(UUID exporterOwnerId) { this.exporterOwnerId = exporterOwnerId; }

    public String getExporterOwnerCode() { return exporterOwnerCode; }
    public void setExporterOwnerCode(String exporterOwnerCode) { this.exporterOwnerCode = exporterOwnerCode; }

    public String getDestinationCountry() { return destinationCountry; }
    public void setDestinationCountry(String destinationCountry) { this.destinationCountry = destinationCountry; }
}
