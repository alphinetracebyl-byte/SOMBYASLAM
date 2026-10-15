package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class ConfiscationRequest {
    @NotNull
    private LocalDate confiscationDate;
    @NotBlank
    private String reason;
    private String locationDescription;
    @NotBlank
    private String enforcementOrderRef;

    public LocalDate getConfiscationDate() { return confiscationDate; }
    public void setConfiscationDate(LocalDate v) { this.confiscationDate = v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public String getLocationDescription() { return locationDescription; }
    public void setLocationDescription(String v) { this.locationDescription = v; }
    public String getEnforcementOrderRef() { return enforcementOrderRef; }
    public void setEnforcementOrderRef(String v) { this.enforcementOrderRef = v; }
}
