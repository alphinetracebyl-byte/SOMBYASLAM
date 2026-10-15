package com.somlits.ownerorg.api.v1.dto.response;

import com.somlits.ownerorg.domain.entity.Owner;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class OwnerResponse {

    private UUID id;
    private String ownerCode;
    private String ownerType;
    private String status;
    private String fullName;
    private String tradingName;
    private String nationalIdType;
    private String nationalIdNumber;
    private String primaryPhone;
    private String alternativePhone;
    private String emailAddress;
    private String regionCode;
    private String districtCode;
    private String villageOrSettlement;
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;
    private UUID registeredBy;
    private Instant submittedAt;
    private UUID reviewedBy;
    private Instant reviewedAt;
    private String rejectionReason;
    private String officerNotes;
    private Long version;
    private Instant createdAt;
    private Instant updatedAt;

    public static OwnerResponse from(Owner owner) {
        OwnerResponse r = new OwnerResponse();
        r.id = owner.getId();
        r.ownerCode = owner.getOwnerCode();
        r.ownerType = owner.getOwnerType().name();
        r.status = owner.getStatus().name();
        r.fullName = owner.getFullName();
        r.tradingName = owner.getTradingName();
        r.nationalIdType = owner.getNationalIdType().name();
        r.nationalIdNumber = owner.getNationalIdNumber();
        r.primaryPhone = owner.getPrimaryPhone();
        r.alternativePhone = owner.getAlternativePhone();
        r.emailAddress = owner.getEmailAddress();
        r.regionCode = owner.getRegionCode();
        r.districtCode = owner.getDistrictCode();
        r.villageOrSettlement = owner.getVillageOrSettlement();
        r.gpsLatitude = owner.getGpsLatitude();
        r.gpsLongitude = owner.getGpsLongitude();
        r.registeredBy = owner.getRegisteredBy();
        r.submittedAt = owner.getSubmittedAt();
        r.reviewedBy = owner.getReviewedBy();
        r.reviewedAt = owner.getReviewedAt();
        r.rejectionReason = owner.getRejectionReason();
        r.officerNotes = owner.getOfficerNotes();
        r.version = owner.getVersion();
        r.createdAt = owner.getCreatedAt();
        r.updatedAt = owner.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getOwnerCode() { return ownerCode; }
    public String getOwnerType() { return ownerType; }
    public String getStatus() { return status; }
    public String getFullName() { return fullName; }
    public String getTradingName() { return tradingName; }
    public String getNationalIdType() { return nationalIdType; }
    public String getNationalIdNumber() { return nationalIdNumber; }
    public String getPrimaryPhone() { return primaryPhone; }
    public String getAlternativePhone() { return alternativePhone; }
    public String getEmailAddress() { return emailAddress; }
    public String getRegionCode() { return regionCode; }
    public String getDistrictCode() { return districtCode; }
    public String getVillageOrSettlement() { return villageOrSettlement; }
    public BigDecimal getGpsLatitude() { return gpsLatitude; }
    public BigDecimal getGpsLongitude() { return gpsLongitude; }
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
