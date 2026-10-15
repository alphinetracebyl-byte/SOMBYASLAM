package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public class ExportDeclarationRequest {
    @NotNull
    private LocalDate exportDate;
    @NotNull
    private UUID borderPostId;
    @NotBlank
    private String exportPermitRef;
    @NotBlank
    @Size(min = 2, max = 2)
    private String destinationCountry;

    public LocalDate getExportDate() { return exportDate; }
    public void setExportDate(LocalDate v) { this.exportDate = v; }
    public UUID getBorderPostId() { return borderPostId; }
    public void setBorderPostId(UUID v) { this.borderPostId = v; }
    public String getExportPermitRef() { return exportPermitRef; }
    public void setExportPermitRef(String v) { this.exportPermitRef = v; }
    public String getDestinationCountry() { return destinationCountry; }
    public void setDestinationCountry(String v) { this.destinationCountry = v; }
}
