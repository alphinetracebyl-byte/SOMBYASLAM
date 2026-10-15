package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public class RegistrationRequest {

    @NotBlank
    private String submissionType; // BIRTH, PURCHASE, IMPORT

    @NotBlank
    private String species;

    @NotBlank
    private String breed;

    @NotBlank
    private String sex;

    private LocalDate dob;
    private String dobPrecision;

    @Size(max = 100)
    private String coatColor;

    private String distinguishingMarks;

    @NotNull
    private UUID ownerId;

    @NotNull
    private UUID premisesId;

    @NotBlank
    private String tagSerial;

    // PURCHASE fields
    private String sourceType;
    private String sourceDescription;

    // IMPORT fields
    private String importPermitNumber;

    @Size(min = 2, max = 2)
    private String countryOfOrigin;

    private String foreignIdNumber;

    // Batch fields — optional; assign animal to an existing batch session
    private UUID batchId;
    private String batchCode;

    @NotNull
    private UUID idempotencyKey;

    public String getSubmissionType() { return submissionType; }
    public void setSubmissionType(String v) { this.submissionType = v; }
    public String getSpecies() { return species; }
    public void setSpecies(String v) { this.species = v; }
    public String getBreed() { return breed; }
    public void setBreed(String v) { this.breed = v; }
    public String getSex() { return sex; }
    public void setSex(String v) { this.sex = v; }
    public LocalDate getDob() { return dob; }
    public void setDob(LocalDate v) { this.dob = v; }
    public String getDobPrecision() { return dobPrecision; }
    public void setDobPrecision(String v) { this.dobPrecision = v; }
    public String getCoatColor() { return coatColor; }
    public void setCoatColor(String v) { this.coatColor = v; }
    public String getDistinguishingMarks() { return distinguishingMarks; }
    public void setDistinguishingMarks(String v) { this.distinguishingMarks = v; }
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID v) { this.ownerId = v; }
    public UUID getPremisesId() { return premisesId; }
    public void setPremisesId(UUID v) { this.premisesId = v; }
    public String getTagSerial() { return tagSerial; }
    public void setTagSerial(String v) { this.tagSerial = v; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String v) { this.sourceType = v; }
    public String getSourceDescription() { return sourceDescription; }
    public void setSourceDescription(String v) { this.sourceDescription = v; }
    public String getImportPermitNumber() { return importPermitNumber; }
    public void setImportPermitNumber(String v) { this.importPermitNumber = v; }
    public String getCountryOfOrigin() { return countryOfOrigin; }
    public void setCountryOfOrigin(String v) { this.countryOfOrigin = v; }
    public String getForeignIdNumber() { return foreignIdNumber; }
    public void setForeignIdNumber(String v) { this.foreignIdNumber = v; }
    public UUID getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(UUID v) { this.idempotencyKey = v; }
    public UUID getBatchId() { return batchId; }
    public void setBatchId(UUID v) { this.batchId = v; }
    public String getBatchCode() { return batchCode; }
    public void setBatchCode(String v) { this.batchCode = v; }
}
