package com.somlits.taginventory.domain.entity;

import com.somlits.taginventory.domain.enums.BagStatus;
import com.somlits.taginventory.domain.enums.CustodyLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_bag")
public class TagBag {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "bag_code", nullable = false, unique = true, length = 40, updatable = false)
    private String bagCode;

    @Column(name = "batch_id", nullable = false)
    private UUID batchId;

    @Column(name = "first_serial", nullable = false, length = 50, updatable = false)
    private String firstSerial;

    @Column(name = "last_serial", nullable = false, length = 50, updatable = false)
    private String lastSerial;

    @Column(name = "tag_count", nullable = false)
    private Integer tagCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private BagStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_custody_level", nullable = false, length = 30)
    private CustodyLevel currentCustodyLevel;

    @Column(name = "current_custodian_id", nullable = false)
    private UUID currentCustodianId;

    @Column(name = "current_custodian_code", length = 30)
    private String currentCustodianCode;

    @Column(name = "issued_to_owner_id")
    private UUID issuedToOwnerId;

    @Column(name = "issued_to_owner_code", length = 20)
    private String issuedToOwnerCode;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "issued_by")
    private UUID issuedBy;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static TagBag create(String bagCode, UUID batchId, String firstSerial, String lastSerial,
                                CustodyLevel custodyLevel, UUID custodianId, String custodianCode) {
        var b = new TagBag();
        b.id = UUID.randomUUID();
        b.bagCode = bagCode;
        b.batchId = batchId;
        b.firstSerial = firstSerial;
        b.lastSerial = lastSerial;
        b.tagCount = 25;
        b.status = BagStatus.RECEIVED;
        b.currentCustodyLevel = custodyLevel;
        b.currentCustodianId = custodianId;
        b.currentCustodianCode = custodianCode;
        b.createdAt = Instant.now();
        b.updatedAt = Instant.now();
        return b;
    }

    public void transferTo(CustodyLevel newLevel, UUID newCustodianId, String newCustodianCode) {
        this.status = BagStatus.IN_TRANSFER;
        this.updatedAt = Instant.now();
    }

    public void receiveTransfer(CustodyLevel newLevel, UUID newCustodianId, String newCustodianCode) {
        this.currentCustodyLevel = newLevel;
        this.currentCustodianId = newCustodianId;
        this.currentCustodianCode = newCustodianCode;
        this.status = BagStatus.IN_STOCK;
        this.updatedAt = Instant.now();
    }

    public void issueToOwner(UUID ownerId, String ownerCode, UUID issuedByUser) {
        this.issuedToOwnerId = ownerId;
        this.issuedToOwnerCode = ownerCode;
        this.issuedAt = Instant.now();
        this.issuedBy = issuedByUser;
        this.currentCustodyLevel = CustodyLevel.OWNER;
        this.currentCustodianId = ownerId;
        this.currentCustodianCode = ownerCode;
        this.status = BagStatus.ISSUED;
        this.updatedAt = Instant.now();
    }

    public void recall() {
        this.status = BagStatus.RECALLED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getBagCode() { return bagCode; }
    public UUID getBatchId() { return batchId; }
    public String getFirstSerial() { return firstSerial; }
    public String getLastSerial() { return lastSerial; }
    public Integer getTagCount() { return tagCount; }
    public BagStatus getStatus() { return status; }
    public CustodyLevel getCurrentCustodyLevel() { return currentCustodyLevel; }
    public UUID getCurrentCustodianId() { return currentCustodianId; }
    public String getCurrentCustodianCode() { return currentCustodianCode; }
    public UUID getIssuedToOwnerId() { return issuedToOwnerId; }
    public String getIssuedToOwnerCode() { return issuedToOwnerCode; }
    public Instant getIssuedAt() { return issuedAt; }
    public UUID getIssuedBy() { return issuedBy; }
    public Long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(BagStatus status) { this.status = status; this.updatedAt = Instant.now(); }
    public void setCurrentCustodyLevel(CustodyLevel level) { this.currentCustodyLevel = level; }
    public void setCurrentCustodianId(UUID id) { this.currentCustodianId = id; }
    public void setCurrentCustodianCode(String code) { this.currentCustodianCode = code; }
}
