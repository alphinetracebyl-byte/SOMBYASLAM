package com.somlits.markettrade.domain.model;

import com.somlits.markettrade.domain.enums.MarketEntryStatus;
import com.somlits.markettrade.domain.enums.VetInspectionStatus;
import com.somlits.markettrade.domain.exception.BusinessRuleViolationException;
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
@Table(name = "market_entry")
public class MarketEntry {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "entry_code", nullable = false, unique = true, length = 25, updatable = false)
    private String entryCode;

    @Column(name = "session_id", nullable = false, updatable = false)
    private UUID sessionId;

    @Column(name = "animal_id", nullable = false, updatable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 25, updatable = false)
    private String animalCode;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(name = "owner_code", nullable = false, length = 30, updatable = false)
    private String ownerCode;

    @Column(name = "movement_id")
    private UUID movementId;

    @Column(name = "holding_pen", length = 50)
    private String holdingPen;

    @Column(name = "entered_at", nullable = false, updatable = false)
    private Instant enteredAt;

    @Column(name = "entered_by", nullable = false, updatable = false)
    private UUID enteredBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "vet_inspection_status", nullable = false, length = 20)
    private VetInspectionStatus vetInspectionStatus = VetInspectionStatus.PENDING;

    @Column(name = "inspected_by")
    private UUID inspectedBy;

    @Column(name = "inspected_at")
    private Instant inspectedAt;

    @Column(name = "inspection_notes")
    private String inspectionNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MarketEntryStatus status = MarketEntryStatus.ACTIVE;

    @Column(name = "exited_at")
    private Instant exitedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public static MarketEntry create(String entryCode, UUID sessionId, UUID animalId, String animalCode,
                                     UUID ownerId, String ownerCode, UUID movementId, String holdingPen,
                                     UUID enteredBy) {
        var e = new MarketEntry();
        e.id = UUID.randomUUID();
        e.entryCode = entryCode;
        e.sessionId = sessionId;
        e.animalId = animalId;
        e.animalCode = animalCode;
        e.ownerId = ownerId;
        e.ownerCode = ownerCode;
        e.movementId = movementId;
        e.holdingPen = holdingPen;
        e.enteredAt = Instant.now();
        e.enteredBy = enteredBy;
        e.vetInspectionStatus = VetInspectionStatus.PENDING;
        e.status = MarketEntryStatus.ACTIVE;
        return e;
    }

    public void vetInspect(VetInspectionStatus inspectionStatus, UUID inspectedBy, String notes) {
        if (this.status != MarketEntryStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ERR-MKT-010",
                    "Vet inspection only allowed on ACTIVE entries. Current: " + this.status);
        }
        this.vetInspectionStatus = inspectionStatus;
        this.inspectedBy = inspectedBy;
        this.inspectedAt = Instant.now();
        this.inspectionNotes = notes;
    }

    public void markSold() {
        if (this.status != MarketEntryStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ERR-MKT-011",
                    "Animal can only be sold from ACTIVE status. Current: " + this.status);
        }
        if (this.vetInspectionStatus != VetInspectionStatus.CLEARED) {
            throw new BusinessRuleViolationException("ERR-MKT-012",
                    "Animal must be vet-cleared before sale. Current inspection: " + this.vetInspectionStatus);
        }
        this.status = MarketEntryStatus.SOLD;
        this.exitedAt = Instant.now();
    }

    public void withdraw() {
        if (this.status != MarketEntryStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ERR-MKT-013",
                    "Animal can only be withdrawn from ACTIVE status. Current: " + this.status);
        }
        this.status = MarketEntryStatus.WITHDRAWN;
        this.exitedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEntryCode() { return entryCode; }
    public UUID getSessionId() { return sessionId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public UUID getOwnerId() { return ownerId; }
    public String getOwnerCode() { return ownerCode; }
    public UUID getMovementId() { return movementId; }
    public String getHoldingPen() { return holdingPen; }
    public Instant getEnteredAt() { return enteredAt; }
    public UUID getEnteredBy() { return enteredBy; }
    public VetInspectionStatus getVetInspectionStatus() { return vetInspectionStatus; }
    public UUID getInspectedBy() { return inspectedBy; }
    public Instant getInspectedAt() { return inspectedAt; }
    public String getInspectionNotes() { return inspectionNotes; }
    public MarketEntryStatus getStatus() { return status; }
    public Instant getExitedAt() { return exitedAt; }
    public Long getVersion() { return version; }
}
