package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public class SlaughterNotificationRequest {
    @NotNull
    private LocalDate slaughterDate;
    @NotNull
    private UUID abattoirId;
    @NotBlank
    private String slaughterRef;

    public LocalDate getSlaughterDate() { return slaughterDate; }
    public void setSlaughterDate(LocalDate v) { this.slaughterDate = v; }
    public UUID getAbattoirId() { return abattoirId; }
    public void setAbattoirId(UUID v) { this.abattoirId = v; }
    public String getSlaughterRef() { return slaughterRef; }
    public void setSlaughterRef(String v) { this.slaughterRef = v; }
}
