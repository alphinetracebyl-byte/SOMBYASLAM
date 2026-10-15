package com.somlits.ownerorg.domain.entity;

import com.somlits.ownerorg.domain.enums.NationalIdType;
import com.somlits.ownerorg.domain.enums.OwnerStatus;
import com.somlits.ownerorg.domain.enums.OwnerType;
import com.somlits.ownerorg.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "owner")
public class Owner {

    private static final String ERR_STATUS = "ERR-OO-010";

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "owner_code", nullable = false, unique = true, length = 20, updatable = false)
    private String ownerCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 40)
    private OwnerType ownerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OwnerStatus status;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "trading_name", length = 200)
    private String tradingName;

    @Enumerated(EnumType.STRING)
    @Column(name = "national_id_type", nullable = false, length = 30)
    private NationalIdType nationalIdType;

    @Column(name = "national_id_number", nullable = false, length = 50)
    private String nationalIdNumber;

    @Column(name = "primary_phone", nullable = false, length = 30)
    private String primaryPhone;

    @Column(name = "alternative_phone", length = 30)
    private String alternativePhone;

    @Column(name = "email_address", length = 150)
    private String emailAddress;

    @Column(name = "region_code", nullable = false, length = 50)
    private String regionCode;

    @Column(name = "district_code", nullable = false, length = 50)
    private String districtCode;

    @Column(name = "village_or_settlement", length = 200)
    private String villageOrSettlement;

    @Column(name = "gps_latitude", precision = 10, scale = 7)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", precision = 10, scale = 7)
    private BigDecimal gpsLongitude;

    @Column(name = "registered_by", nullable = false)
    private UUID registeredBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "officer_notes")
    private String officerNotes;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Owner() {
        // JPA
    }

    public static Owner create(OwnerType ownerType, String fullName, NationalIdType nationalIdType,
                               String nationalIdNumber, String primaryPhone,
                               String regionCode, String districtCode, UUID registeredBy) {
        Owner o = new Owner();
        o.id = UUID.randomUUID();
        o.ownerType = ownerType;
        o.fullName = fullName;
        o.nationalIdType = nationalIdType;
        o.nationalIdNumber = nationalIdNumber;
        o.primaryPhone = primaryPhone;
        o.regionCode = regionCode;
        o.districtCode = districtCode;
        o.registeredBy = registeredBy;
        o.status = OwnerStatus.DRAFT;
        o.createdAt = Instant.now();
        o.updatedAt = Instant.now();
        return o;
    }

    // --- State transitions ---

    public void submit() {
        if (this.status != OwnerStatus.DRAFT && this.status != OwnerStatus.REJECTED) {
            throw new BusinessRuleViolationException("ERR-OO-011",
                    "Owner can only be submitted from DRAFT or REJECTED status. Current: " + this.status);
        }
        this.status = OwnerStatus.SUBMITTED;
        this.submittedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void startReview() {
        if (this.status != OwnerStatus.SUBMITTED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Owner must be SUBMITTED to start review. Current: " + this.status);
        }
        this.status = OwnerStatus.UNDER_REVIEW;
        this.updatedAt = Instant.now();
    }

    public void approve(UUID reviewedBy) {
        if (this.status != OwnerStatus.SUBMITTED && this.status != OwnerStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Owner must be SUBMITTED or UNDER_REVIEW to approve. Current: " + this.status);
        }
        this.status = OwnerStatus.APPROVED;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = Instant.now();
        this.rejectionReason = null;
        this.updatedAt = Instant.now();
    }

    public void reject(UUID reviewedBy, String reason) {
        if (this.status != OwnerStatus.SUBMITTED && this.status != OwnerStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Owner must be SUBMITTED or UNDER_REVIEW to reject. Current: " + this.status);
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleViolationException("ERR-OO-012",
                    "Rejection reason is required");
        }
        this.status = OwnerStatus.REJECTED;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = Instant.now();
        this.rejectionReason = reason;
        this.updatedAt = Instant.now();
    }

    public void suspend(String reason) {
        if (this.status != OwnerStatus.APPROVED && this.status != OwnerStatus.REACTIVATED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Owner must be APPROVED or REACTIVATED to suspend. Current: " + this.status);
        }
        this.status = OwnerStatus.SUSPENDED;
        this.officerNotes = reason;
        this.updatedAt = Instant.now();
    }

    public void reactivate() {
        if (this.status != OwnerStatus.SUSPENDED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Owner must be SUSPENDED to reactivate. Current: " + this.status);
        }
        this.status = OwnerStatus.REACTIVATED;
        this.updatedAt = Instant.now();
    }

    public void close() {
        if (this.status == OwnerStatus.CLOSED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Owner is already CLOSED");
        }
        this.status = OwnerStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    // --- Profile updates (DRAFT or REJECTED only) ---

    public void updateProfile(String fullName, String tradingName, String primaryPhone,
                              String alternativePhone, String emailAddress,
                              String regionCode, String districtCode, String villageOrSettlement,
                              BigDecimal gpsLatitude, BigDecimal gpsLongitude) {
        if (this.status != OwnerStatus.DRAFT && this.status != OwnerStatus.REJECTED) {
            throw new BusinessRuleViolationException("ERR-OO-013",
                    "Profile can only be updated in DRAFT or REJECTED status. Current: " + this.status);
        }
        this.fullName = fullName;
        this.tradingName = tradingName;
        this.primaryPhone = primaryPhone;
        this.alternativePhone = alternativePhone;
        this.emailAddress = emailAddress;
        this.regionCode = regionCode;
        this.districtCode = districtCode;
        this.villageOrSettlement = villageOrSettlement;
        this.gpsLatitude = gpsLatitude;
        this.gpsLongitude = gpsLongitude;
        this.updatedAt = Instant.now();
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public String getOwnerCode() { return ownerCode; }
    public OwnerType getOwnerType() { return ownerType; }
    public OwnerStatus getStatus() { return status; }
    public String getFullName() { return fullName; }
    public String getTradingName() { return tradingName; }
    public NationalIdType getNationalIdType() { return nationalIdType; }
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

    // Package-private setter for ownerCode — set by OwnerCodeGenerator after persist
    public void assignOwnerCode(String ownerCode) {
        if (this.ownerCode != null) {
            throw new BusinessRuleViolationException("ERR-OO-001",
                    "Owner code is already assigned and cannot be changed");
        }
        this.ownerCode = ownerCode;
        this.updatedAt = Instant.now();
    }

    public void setOfficerNotes(String officerNotes) {
        this.officerNotes = officerNotes;
        this.updatedAt = Instant.now();
    }
}
