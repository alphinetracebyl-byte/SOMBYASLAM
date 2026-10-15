package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class DeathNotificationRequest {
    @NotNull
    private LocalDate deathDate;
    private String causeOfDeath;
    private String locationDescription;
    private String notes;

    public LocalDate getDeathDate() { return deathDate; }
    public void setDeathDate(LocalDate v) { this.deathDate = v; }
    public String getCauseOfDeath() { return causeOfDeath; }
    public void setCauseOfDeath(String v) { this.causeOfDeath = v; }
    public String getLocationDescription() { return locationDescription; }
    public void setLocationDescription(String v) { this.locationDescription = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
}
