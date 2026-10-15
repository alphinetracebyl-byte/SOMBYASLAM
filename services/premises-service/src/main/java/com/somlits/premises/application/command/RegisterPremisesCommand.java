package com.somlits.premises.application.command;

import com.somlits.premises.domain.enums.PremisesType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class RegisterPremisesCommand {

    private final PremisesType premisesType;
    private final String premisesName;
    private final UUID ownerId;
    private final String ownerCode;
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
    private final UUID registeredBy;

    public RegisterPremisesCommand(PremisesType premisesType, String premisesName,
                                    UUID ownerId, String ownerCode,
                                    String regionCode, String districtCode,
                                    String villageOrSettlement, String physicalAddress,
                                    BigDecimal gpsLatitude, BigDecimal gpsLongitude,
                                    BigDecimal areaHectares, Integer capacityAnimals,
                                    String allowedSpecies, String licenseNumber,
                                    LocalDate licenseExpiryDate, Boolean isTemporary,
                                    LocalDate temporaryEndDate, UUID registeredBy) {
        this.premisesType = premisesType;
        this.premisesName = premisesName;
        this.ownerId = ownerId;
        this.ownerCode = ownerCode;
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
        this.registeredBy = registeredBy;
    }

    public PremisesType getPremisesType() { return premisesType; }
    public String getPremisesName() { return premisesName; }
    public UUID getOwnerId() { return ownerId; }
    public String getOwnerCode() { return ownerCode; }
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
    public UUID getRegisteredBy() { return registeredBy; }
}
