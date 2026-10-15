package com.somlits.premises.domain.entity;

import com.somlits.premises.domain.enums.PremisesStatus;
import com.somlits.premises.domain.enums.PremisesType;
import com.somlits.premises.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "premises")
public class Premises {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "premises_code", nullable = false, unique = true, length = 20, updatable = false)
    private String premisesCode;

    @Column(name = "premises_name", nullable = false, length = 200)
    private String premisesName;

    @Enumerated(EnumType.STRING)
    @Column(name = "premises_type", nullable = false, length = 40)
    private PremisesType premisesType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PremisesStatus status = PremisesStatus.DRAFT;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "owner_code", nullable = false, length = 20)
    private String ownerCode;

    @Column(name = "region_code", nullable = false, length = 50)
    private String regionCode;

    @Column(name = "district_code", nullable = false, length = 50)
    private String districtCode;

    @Column(name = "village_or_settlement", length = 200)
    private String villageOrSettlement;

    @Column(name = "physical_address", nullable = false, length = 500)
    private String physicalAddress;

    @Column(name = "gps_latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal gpsLongitude;

    @Column(name = "area_hectares", precision = 10, scale = 2)
    private BigDecimal areaHectares;

    @Column(name = "capacity_animals")
    private Integer capacityAnimals;

    @Column(name = "allowed_species", length = 200)
    private String allowedSpecies;

    @Column(name = "license_number", length = 100)
    private String licenseNumber;

    @Column(name = "license_expiry_date")
    private LocalDate licenseExpiryDate;

    @Column(name = "is_temporary", nullable = false)
    private Boolean isTemporary = false;

    @Column(name = "temporary_end_date")
    private LocalDate temporaryEndDate;

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

    protected Premises() {}

    /**
     * Static factory — creates a new Premises aggregate in DRAFT status.
     */
    public static Premises create(PremisesType premisesType, String premisesName,
                                   UUID ownerId, String ownerCode,
                                   String regionCode, String districtCode,
                                   String physicalAddress,
                                   BigDecimal gpsLatitude, BigDecimal gpsLongitude,
                                   UUID registeredBy) {
        var p = new Premises();
        p.id = UUID.randomUUID();
        p.premisesType = premisesType;
        p.premisesName = premisesName;
        p.ownerId = ownerId;
        p.ownerCode = ownerCode;
        p.regionCode = regionCode;
        p.districtCode = districtCode;
        p.physicalAddress = physicalAddress;
        p.gpsLatitude = gpsLatitude;
        p.gpsLongitude = gpsLongitude;
        p.registeredBy = registeredBy;
        p.status = PremisesStatus.DRAFT;
        p.isTemporary = false;
        p.createdAt = Instant.now();
        p.updatedAt = Instant.now();
        return p;
    }

    // ── Status transitions ────────────────────────────────────────────────────

    public void submit() {
        if (this.status != PremisesStatus.DRAFT && this.status != PremisesStatus.REJECTED) {
            throw new BusinessRuleViolationException("ERR-PRM-001",
                    "Only DRAFT or REJECTED premises can be submitted (current: " + this.status + ")");
        }
        this.status = PremisesStatus.SUBMITTED;
        this.submittedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void approve(UUID reviewedBy) {
        if (this.status != PremisesStatus.SUBMITTED && this.status != PremisesStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException("ERR-PRM-002",
                    "Only SUBMITTED or UNDER_REVIEW premises can be approved (current: " + this.status + ")");
        }
        this.status = PremisesStatus.APPROVED;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = Instant.now();
        this.rejectionReason = null;
        this.updatedAt = Instant.now();
    }

    public void reject(UUID reviewedBy, String reason) {
        if (this.status != PremisesStatus.SUBMITTED && this.status != PremisesStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException("ERR-PRM-003",
                    "Only SUBMITTED or UNDER_REVIEW premises can be rejected (current: " + this.status + ")");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleViolationException("ERR-PRM-004", "Rejection reason is required");
        }
        this.status = PremisesStatus.REJECTED;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = Instant.now();
        this.rejectionReason = reason;
        this.updatedAt = Instant.now();
    }

    public void suspend(String reason) {
        if (this.status != PremisesStatus.APPROVED) {
            throw new BusinessRuleViolationException("ERR-PRM-005",
                    "Only APPROVED premises can be suspended (current: " + this.status + ")");
        }
        this.status = PremisesStatus.SUSPENDED;
        this.officerNotes = reason;
        this.updatedAt = Instant.now();
    }

    public void reactivate() {
        if (this.status != PremisesStatus.SUSPENDED) {
            throw new BusinessRuleViolationException("ERR-PRM-006",
                    "Only SUSPENDED premises can be reactivated (current: " + this.status + ")");
        }
        this.status = PremisesStatus.APPROVED;
        this.updatedAt = Instant.now();
    }

    public void close() {
        if (this.status == PremisesStatus.DRAFT) {
            throw new BusinessRuleViolationException("ERR-PRM-007",
                    "Cannot close premises in DRAFT status");
        }
        if (this.status == PremisesStatus.CLOSED) {
            throw new BusinessRuleViolationException("ERR-PRM-008",
                    "Premises is already CLOSED");
        }
        this.status = PremisesStatus.CLOSED;
        this.updatedAt = Instant.now();
    }

    /**
     * Business rule: premises is eligible for movement origin/destination when APPROVED.
     */
    public boolean isEligibleForMovement() {
        return this.status == PremisesStatus.APPROVED;
    }

    // ── Update helpers (DRAFT/REJECTED only — enforced at service layer) ─────

    public void updateDetails(String premisesName, String regionCode, String districtCode,
                               String villageOrSettlement, String physicalAddress,
                               BigDecimal gpsLatitude, BigDecimal gpsLongitude,
                               BigDecimal areaHectares, Integer capacityAnimals,
                               String allowedSpecies, String licenseNumber,
                               LocalDate licenseExpiryDate, Boolean isTemporary,
                               LocalDate temporaryEndDate, String officerNotes) {
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
        if (isTemporary != null) {
            this.isTemporary = isTemporary;
        }
        this.temporaryEndDate = temporaryEndDate;
        this.officerNotes = officerNotes;
        this.updatedAt = Instant.now();
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    public UUID getId() { return id; }
    public String getPremisesCode() { return premisesCode; }
    public String getPremisesName() { return premisesName; }
    public PremisesType getPremisesType() { return premisesType; }
    public PremisesStatus getStatus() { return status; }
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

    // Package-private setter used by PremisesCodeGenerator after initial save
    void setPremisesCode(String premisesCode) {
        this.premisesCode = premisesCode;
    }
}
