package com.somlits.premises.api.v1.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class UpdatePremisesRequest {

    @NotBlank
    @Size(max = 200)
    private String premisesName;

    @NotBlank
    @Size(max = 50)
    private String regionCode;

    @NotBlank
    @Size(max = 50)
    private String districtCode;

    @Size(max = 200)
    private String villageOrSettlement;

    @NotBlank
    @Size(max = 500)
    private String physicalAddress;

    @NotNull
    @DecimalMin("-90.0000000")
    @DecimalMax("90.0000000")
    private BigDecimal gpsLatitude;

    @NotNull
    @DecimalMin("-180.0000000")
    @DecimalMax("180.0000000")
    private BigDecimal gpsLongitude;

    @Positive
    private BigDecimal areaHectares;

    @Positive
    private Integer capacityAnimals;

    @Size(max = 200)
    private String allowedSpecies;

    @Size(max = 100)
    private String licenseNumber;

    private LocalDate licenseExpiryDate;

    private Boolean isTemporary;

    private LocalDate temporaryEndDate;

    @Size(max = 2000)
    private String officerNotes;

    // Getters and setters

    public String getPremisesName() { return premisesName; }
    public void setPremisesName(String premisesName) { this.premisesName = premisesName; }

    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }

    public String getDistrictCode() { return districtCode; }
    public void setDistrictCode(String districtCode) { this.districtCode = districtCode; }

    public String getVillageOrSettlement() { return villageOrSettlement; }
    public void setVillageOrSettlement(String v) { this.villageOrSettlement = v; }

    public String getPhysicalAddress() { return physicalAddress; }
    public void setPhysicalAddress(String physicalAddress) { this.physicalAddress = physicalAddress; }

    public BigDecimal getGpsLatitude() { return gpsLatitude; }
    public void setGpsLatitude(BigDecimal gpsLatitude) { this.gpsLatitude = gpsLatitude; }

    public BigDecimal getGpsLongitude() { return gpsLongitude; }
    public void setGpsLongitude(BigDecimal gpsLongitude) { this.gpsLongitude = gpsLongitude; }

    public BigDecimal getAreaHectares() { return areaHectares; }
    public void setAreaHectares(BigDecimal areaHectares) { this.areaHectares = areaHectares; }

    public Integer getCapacityAnimals() { return capacityAnimals; }
    public void setCapacityAnimals(Integer capacityAnimals) { this.capacityAnimals = capacityAnimals; }

    public String getAllowedSpecies() { return allowedSpecies; }
    public void setAllowedSpecies(String allowedSpecies) { this.allowedSpecies = allowedSpecies; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public LocalDate getLicenseExpiryDate() { return licenseExpiryDate; }
    public void setLicenseExpiryDate(LocalDate licenseExpiryDate) { this.licenseExpiryDate = licenseExpiryDate; }

    public Boolean getIsTemporary() { return isTemporary; }
    public void setIsTemporary(Boolean isTemporary) { this.isTemporary = isTemporary; }

    public LocalDate getTemporaryEndDate() { return temporaryEndDate; }
    public void setTemporaryEndDate(LocalDate temporaryEndDate) { this.temporaryEndDate = temporaryEndDate; }

    public String getOfficerNotes() { return officerNotes; }
    public void setOfficerNotes(String officerNotes) { this.officerNotes = officerNotes; }
}
