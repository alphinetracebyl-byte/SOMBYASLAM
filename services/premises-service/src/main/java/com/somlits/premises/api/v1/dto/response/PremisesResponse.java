package com.somlits.premises.api.v1.dto.response;

import com.somlits.premises.domain.entity.Premises;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class PremisesResponse {

    private UUID id;
    private String premisesCode;
    private String premisesName;
    private String premisesType;
    private String status;
    private UUID ownerId;
    private String ownerCode;
    private String regionCode;
    private String districtCode;
    private String villageOrSettlement;
    private String physicalAddress;
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;
    private BigDecimal areaHectares;
    private Integer capacityAnimals;
    private String allowedSpecies;
    private String licenseNumber;
    private LocalDate licenseExpiryDate;
    private Boolean isTemporary;
    private LocalDate temporaryEndDate;
    private UUID registeredBy;
    private Instant submittedAt;
    private UUID reviewedBy;
    private Instant reviewedAt;
    private String rejectionReason;
    private String officerNotes;
    private Long version;
    private Instant createdAt;
    private Instant updatedAt;

    public static PremisesResponse from(Premises p) {
        var r = new PremisesResponse();
        r.id = p.getId();
        r.premisesCode = p.getPremisesCode();
        r.premisesName = p.getPremisesName();
        r.premisesType = p.getPremisesType().name();
        r.status = p.getStatus().name();
        r.ownerId = p.getOwnerId();
        r.ownerCode = p.getOwnerCode();
        r.regionCode = p.getRegionCode();
        r.districtCode = p.getDistrictCode();
        r.villageOrSettlement = p.getVillageOrSettlement();
        r.physicalAddress = p.getPhysicalAddress();
        r.gpsLatitude = p.getGpsLatitude();
        r.gpsLongitude = p.getGpsLongitude();
        r.areaHectares = p.getAreaHectares();
        r.capacityAnimals = p.getCapacityAnimals();
        r.allowedSpecies = p.getAllowedSpecies();
        r.licenseNumber = p.getLicenseNumber();
        r.licenseExpiryDate = p.getLicenseExpiryDate();
        r.isTemporary = p.getIsTemporary();
        r.temporaryEndDate = p.getTemporaryEndDate();
        r.registeredBy = p.getRegisteredBy();
        r.submittedAt = p.getSubmittedAt();
        r.reviewedBy = p.getReviewedBy();
        r.reviewedAt = p.getReviewedAt();
        r.rejectionReason = p.getRejectionReason();
        r.officerNotes = p.getOfficerNotes();
        r.version = p.getVersion();
        r.createdAt = p.getCreatedAt();
        r.updatedAt = p.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getPremisesCode() { return premisesCode; }
    public String getPremisesName() { return premisesName; }
    public String getPremisesType() { return premisesType; }
    public String getStatus() { return status; }
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
    public Instant getSubmittedAt() { return submittedAt; }
    public UUID getReviewedBy() { return reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getRejectionReason() { return rejectionReason; }
    public String getOfficerNotes() { return officerNotes; }
    public Long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
