package com.somlits.animalregistry.api.v1.dto.response;

import com.somlits.animalregistry.domain.model.AnimalRecord;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class AnimalResponse {
    private UUID id;
    private String animalCode;
    private String species;
    private String breed;
    private String sex;
    private LocalDate dob;
    private String dobPrecision;
    private String coatColor;
    private String distinguishingMarks;
    private String status;
    private UUID currentOwnerId;
    private UUID currentPremisesId;
    private String activeTagSerial;
    private UUID primaryPhotoId;
    private String sourceType;
    private Instant terminatedAt;
    private Instant registeredAt;

    public static AnimalResponse from(AnimalRecord a) {
        var r = new AnimalResponse();
        r.id = a.getId();
        r.animalCode = a.getAnimalCode();
        r.species = a.getSpecies().name();
        r.breed = a.getBreed();
        r.sex = a.getSex().name();
        r.dob = a.getDob();
        r.dobPrecision = a.getDobPrecision().name();
        r.coatColor = a.getCoatColor();
        r.distinguishingMarks = a.getDistinguishingMarks();
        r.status = a.getStatus().name();
        r.currentOwnerId = a.getCurrentOwnerId();
        r.currentPremisesId = a.getCurrentPremisesId();
        r.activeTagSerial = a.getActiveTagSerial();
        r.primaryPhotoId = a.getPrimaryPhotoId();
        r.sourceType = a.getSourceType().name();
        r.terminatedAt = a.getTerminatedAt();
        r.registeredAt = a.getRegisteredAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getAnimalCode() { return animalCode; }
    public String getSpecies() { return species; }
    public String getBreed() { return breed; }
    public String getSex() { return sex; }
    public LocalDate getDob() { return dob; }
    public String getDobPrecision() { return dobPrecision; }
    public String getCoatColor() { return coatColor; }
    public String getDistinguishingMarks() { return distinguishingMarks; }
    public String getStatus() { return status; }
    public UUID getCurrentOwnerId() { return currentOwnerId; }
    public UUID getCurrentPremisesId() { return currentPremisesId; }
    public String getActiveTagSerial() { return activeTagSerial; }
    public UUID getPrimaryPhotoId() { return primaryPhotoId; }
    public String getSourceType() { return sourceType; }
    public Instant getTerminatedAt() { return terminatedAt; }
    public Instant getRegisteredAt() { return registeredAt; }
}
