package com.somlits.premises.application.command;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class UpdatePremisesCommand {

    private final UUID premisesId;
    private final String premisesName;
    private final String regionCode;
    private final String districtCode;
    private final String villageOrSettlement;
    private final String physicalAddress;
    private final BigDecimal gpsLatitude;
    private final BigDecimal gpsLongitude;
    private final BigDecimal areaHectares;
    private final Integer capacityAnimals;
    private final String allowedSpecies;
    private final String licenseNumber;
    private final LocalDate licenseExpiryDate;
    private final Boolean isTemporary;
    private final LocalDate temporaryEndDate;
    private final String officerNotes;
    private final UUID callerUserId;

    public UpdatePremisesCommand(UUID premisesId, String premisesName,
                                  String regionCode, String districtCode,
                                  String villageOrSettlement, String physicalAddress,
                                  BigDecimal gpsLatitude, BigDecimal gpsLongitude,
                                  BigDecimal areaHectares, Integer capacityAnimals,
                                  String allowedSpecies, String licenseNumber,
                                  LocalDate licenseExpiryDate, Boolean isTemporary,
                                  LocalDate temporaryEndDate, String officerNotes,
                                  UUID callerUserId) {
        this.premisesId = premisesId;
        this.premisesName = premisesName;
        this.regionCode = regionCode;
        this.districtCode = districtCode;
        this.villageOrSettlement = villageOrSettlement;
        this.physicalAddress = physicalAddress;
        this.gpsLatitude = gpsLatitude;
        this.gpsLongitude = gpsLongitude;
        this.areaHectares = areaHectares;
        this.capacityAnimals = capacityAnimals;
        this.allowedSpecies = allowedSpecies;
        this.licenseNumber = licenseNumber;
        this.licenseExpiryDate = licenseExpiryDate;
        this.isTemporary = isTemporary;
        this.temporaryEndDate = temporaryEndDate;
        this.officerNotes = officerNotes;
        this.callerUserId = callerUserId;
    }

    public UUID getPremisesId() { return premisesId; }
    public String getPremisesName() { return premisesName; }
    public String getRegionCode() { return regionCode; }
    public String getDistrictCode() { return districtCode; }
    public String getVillageOrSettlement() { return villageOrSettlement; }
    public String getPhysicalAddress() { return physicalAddress; }
    public BigDecimal getGpsLatitude() { return gpsLatitude; }
    public BigDecimal getGpsLongitude() { return gpsLongitude; }
    public BigDecimal getAreaHectares() { return areaHectares; }
    public Integer getCapacityAnimals() { return capacityAnimals; }
    public String getAllowedSpecies() { return allowedSpecies; }
    public String getLicenseNumber() { return licenseNumber; }
    public LocalDate getLicenseExpiryDate() { return licenseExpiryDate; }
    public Boolean getIsTemporary() { return isTemporary; }
    public LocalDate getTemporaryEndDate() { return temporaryEndDate; }
    public String getOfficerNotes() { return officerNotes; }
    public UUID getCallerUserId() { return callerUserId; }
}
