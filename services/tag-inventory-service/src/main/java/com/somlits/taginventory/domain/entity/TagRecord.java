package com.somlits.taginventory.domain.entity;

import com.somlits.taginventory.domain.enums.CustodyLevel;
import com.somlits.taginventory.domain.enums.TagStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_record")
public class TagRecord {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "serial_number", nullable = false, unique = true, length = 50, updatable = false)
    private String serialNumber;

    @Column(name = "bag_id", nullable = false)
    private UUID bagId;

    @Column(name = "batch_id", nullable = false)
    private UUID batchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TagStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_custody_level", nullable = false, length = 30)
    private CustodyLevel currentCustodyLevel;

    @Column(name = "current_custodian_id", nullable = false)
    private UUID currentCustodianId;

    @Column(name = "animal_id")
    private UUID animalId;

    @Column(name = "animal_code", length = 30)
    private String animalCode;

    @Column(name = "reserved_for_request_id")
    private UUID reservedForRequestId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static TagRecord create(String serialNumber, UUID bagId, UUID batchId,
                                   CustodyLevel custodyLevel, UUID custodianId) {
        var t = new TagRecord();
        t.id = UUID.randomUUID();
        t.serialNumber = serialNumber;
        t.bagId = bagId;
        t.batchId = batchId;
        t.status = TagStatus.RECEIVED;
        t.currentCustodyLevel = custodyLevel;
        t.currentCustodianId = custodianId;
        t.createdAt = Instant.now();
        t.updatedAt = Instant.now();
        return t;
    }

    public void transferTo(CustodyLevel newLevel, UUID newCustodianId) {
        this.currentCustodyLevel = newLevel;
        this.currentCustodianId = newCustodianId;
        this.status = TagStatus.IN_TRANSFER;
        this.updatedAt = Instant.now();
    }

    public void receiveTransfer(CustodyLevel newLevel, UUID newCustodianId) {
        this.currentCustodyLevel = newLevel;
        this.currentCustodianId = newCustodianId;
        this.status = TagStatus.IN_STOCK;
        this.updatedAt = Instant.now();
    }

    public void issueToOwner(UUID ownerId, CustodyLevel level) {
        this.currentCustodianId = ownerId;
        this.currentCustodyLevel = level;
        this.status = TagStatus.ISSUED_TO_OWNER;
        this.updatedAt = Instant.now();
    }

    public void assignToAnimal(UUID animalId, String animalCode) {
        this.animalId = animalId;
        this.animalCode = animalCode;
        this.status = TagStatus.ASSIGNED_TO_ANIMAL;
        this.updatedAt = Instant.now();
    }

    public void markLost() {
        this.status = TagStatus.LOST;
        this.updatedAt = Instant.now();
    }

    public void markDamaged() {
        this.status = TagStatus.DAMAGED;
        this.updatedAt = Instant.now();
    }

    public void recall() {
        this.status = TagStatus.RECALLED;
        this.updatedAt = Instant.now();
    }

    public void retire() {
        this.status = TagStatus.RETIRED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getSerialNumber() { return serialNumber; }
    public UUID getBagId() { return bagId; }
    public UUID getBatchId() { return batchId; }
    public TagStatus getStatus() { return status; }
    public CustodyLevel getCurrentCustodyLevel() { return currentCustodyLevel; }
    public UUID getCurrentCustodianId() { return currentCustodianId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public UUID getReservedForRequestId() { return reservedForRequestId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(TagStatus status) { this.status = status; this.updatedAt = Instant.now(); }
    public void setCurrentCustodyLevel(CustodyLevel level) { this.currentCustodyLevel = level; }
    public void setCurrentCustodianId(UUID id) { this.currentCustodianId = id; }
    public void setReservedForRequestId(UUID requestId) { this.reservedForRequestId = requestId; }
}
