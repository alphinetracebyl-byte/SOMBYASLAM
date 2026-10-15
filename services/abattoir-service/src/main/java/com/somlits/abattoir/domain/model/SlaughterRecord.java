package com.somlits.abattoir.domain.model;

import com.somlits.abattoir.domain.enums.AnteMortemDecision;
import com.somlits.abattoir.domain.enums.PostMortemDecision;
import com.somlits.abattoir.domain.enums.SlaughterRecordStatus;
import com.somlits.abattoir.domain.exception.BusinessRuleViolationException;
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
@Table(name = "slaughter_record")
public class SlaughterRecord {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "record_code", nullable = false, unique = true, length = 25, updatable = false)
    private String recordCode;

    @Column(name = "session_id", nullable = false, updatable = false)
    private UUID sessionId;

    @Column(name = "animal_id", nullable = false, updatable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 25, updatable = false)
    private String animalCode;

    @Column(name = "tag_serial", length = 50, updatable = false)
    private String tagSerial;

    @Column(name = "movement_permit_id")
    private UUID movementPermitId;

    @Column(name = "owner_code", nullable = false, length = 30, updatable = false)
    private String ownerCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SlaughterRecordStatus status = SlaughterRecordStatus.ARRIVED;

    @Column(name = "arrived_at", nullable = false, updatable = false)
    private Instant arrivedAt;

    @Column(name = "arrived_by", nullable = false, updatable = false)
    private UUID arrivedBy;

    @Column(name = "tag_verified", nullable = false)
    private Boolean tagVerified = false;

    @Column(name = "permit_verified", nullable = false)
    private Boolean permitVerified = false;

    // Ante-mortem fields
    @Enumerated(EnumType.STRING)
    @Column(name = "ante_mortem_decision", length = 20)
    private AnteMortemDecision anteMortemDecision;

    @Column(name = "ante_mortem_inspected_by")
    private UUID anteMortemInspectedBy;

    @Column(name = "ante_mortem_at")
    private Instant anteMortemAt;

    @Column(name = "ante_mortem_notes")
    private String anteMortemNotes;

    @Column(name = "hold_reason")
    private String holdReason;

    // Slaughter fields
    @Column(name = "slaughtered_at")
    private Instant slaughteredAt;

    @Column(name = "slaughtered_by")
    private UUID slaughteredBy;

    @Column(name = "lairage_hours")
    private Integer lairageHours;

    // Post-mortem fields
    @Enumerated(EnumType.STRING)
    @Column(name = "post_mortem_decision", length = 25)
    private PostMortemDecision postMortemDecision;

    @Column(name = "post_mortem_inspected_by")
    private UUID postMortemInspectedBy;

    @Column(name = "post_mortem_at")
    private Instant postMortemAt;

    @Column(name = "post_mortem_notes")
    private String postMortemNotes;

    @Column(name = "condemnation_reason")
    private String condemnationReason;

    @Column(name = "condemned_partial")
    private Boolean condemnedPartial;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static SlaughterRecord create(UUID sessionId, String recordCode, UUID animalId,
                                         String animalCode, String tagSerial,
                                         String ownerCode, UUID arrivedBy) {
        var r = new SlaughterRecord();
        r.id = UUID.randomUUID();
        r.recordCode = recordCode;
        r.sessionId = sessionId;
        r.animalId = animalId;
        r.animalCode = animalCode;
        r.tagSerial = tagSerial;
        r.ownerCode = ownerCode;
        r.status = SlaughterRecordStatus.ARRIVED;
        r.arrivedAt = Instant.now();
        r.arrivedBy = arrivedBy;
        r.tagVerified = false;
        r.permitVerified = false;
        r.updatedAt = Instant.now();
        return r;
    }

    public void verifyTag() {
        this.tagVerified = true;
        this.updatedAt = Instant.now();
        advanceToAnteMortemPendingIfReady();
    }

    public void verifyPermit() {
        this.permitVerified = true;
        this.updatedAt = Instant.now();
        advanceToAnteMortemPendingIfReady();
    }

    private void advanceToAnteMortemPendingIfReady() {
        if (this.status == SlaughterRecordStatus.ARRIVED && this.tagVerified) {
            this.status = SlaughterRecordStatus.ANTE_MORTEM_PENDING;
        }
    }

    public void recordAnteMortem(AnteMortemDecision decision, UUID inspectedBy, String notes) {
        requireStatus(SlaughterRecordStatus.ANTE_MORTEM_PENDING, "ante-mortem inspection");
        this.anteMortemDecision = decision;
        this.anteMortemInspectedBy = inspectedBy;
        this.anteMortemAt = Instant.now();
        this.anteMortemNotes = notes;
        this.status = SlaughterRecordStatus.ANTE_MORTEM_DONE;
        this.updatedAt = Instant.now();
    }

    public void approveForSlaughter() {
        if (this.status != SlaughterRecordStatus.ANTE_MORTEM_DONE) {
            throw new BusinessRuleViolationException("ERR-AB-010",
                    "Ante-mortem inspection must be completed before approving for slaughter");
        }
        if (this.anteMortemDecision != AnteMortemDecision.APPROVED) {
            throw new BusinessRuleViolationException("ERR-AB-011",
                    "Ante-mortem decision must be APPROVED to proceed to slaughter");
        }
        this.status = SlaughterRecordStatus.APPROVED_FOR_SLAUGHTER;
        this.updatedAt = Instant.now();
    }

    public void hold(String reason) {
        if (this.status != SlaughterRecordStatus.ANTE_MORTEM_DONE
                && this.status != SlaughterRecordStatus.ANTE_MORTEM_PENDING) {
            throw new BusinessRuleViolationException("ERR-AB-012",
                    "Cannot hold record in status " + this.status);
        }
        this.status = SlaughterRecordStatus.HELD;
        this.holdReason = reason;
        this.updatedAt = Instant.now();
    }

    public void reject(String reason) {
        if (this.status == SlaughterRecordStatus.SLAUGHTERED
                || this.status == SlaughterRecordStatus.POST_MORTEM_DONE
                || this.status == SlaughterRecordStatus.CONDEMNED
                || this.status == SlaughterRecordStatus.EMERGENCY_SLAUGHTER) {
            throw new BusinessRuleViolationException("ERR-AB-013",
                    "Cannot reject record in terminal status " + this.status);
        }
        this.status = SlaughterRecordStatus.REJECTED;
        this.holdReason = reason;
        this.updatedAt = Instant.now();
    }

    public void recordSlaughter(UUID slaughteredBy) {
        requireStatus(SlaughterRecordStatus.APPROVED_FOR_SLAUGHTER, "slaughter");
        this.status = SlaughterRecordStatus.SLAUGHTERED;
        this.slaughteredAt = Instant.now();
        this.slaughteredBy = slaughteredBy;
        this.updatedAt = Instant.now();
    }

    public void recordPostMortem(PostMortemDecision decision, UUID inspectedBy, String notes) {
        requireStatus(SlaughterRecordStatus.SLAUGHTERED, "post-mortem inspection");
        this.postMortemDecision = decision;
        this.postMortemInspectedBy = inspectedBy;
        this.postMortemAt = Instant.now();
        this.postMortemNotes = notes;
        this.status = SlaughterRecordStatus.POST_MORTEM_DONE;
        this.updatedAt = Instant.now();
    }

    public void condemn(String reason) {
        if (this.status != SlaughterRecordStatus.POST_MORTEM_DONE) {
            throw new BusinessRuleViolationException("ERR-AB-014",
                    "Post-mortem must be completed before condemning");
        }
        if (this.postMortemDecision == PostMortemDecision.PASSED) {
            throw new BusinessRuleViolationException("ERR-AB-015",
                    "Cannot condemn a carcass that PASSED post-mortem");
        }
        this.status = SlaughterRecordStatus.CONDEMNED;
        this.condemnationReason = reason;
        this.condemnedPartial = (this.postMortemDecision == PostMortemDecision.PARTIALLY_CONDEMNED);
        this.updatedAt = Instant.now();
    }

    public void emergencySlaughter(String reason) {
        if (this.status == SlaughterRecordStatus.SLAUGHTERED
                || this.status == SlaughterRecordStatus.POST_MORTEM_DONE
                || this.status == SlaughterRecordStatus.CONDEMNED
                || this.status == SlaughterRecordStatus.EMERGENCY_SLAUGHTER
                || this.status == SlaughterRecordStatus.REJECTED) {
            throw new BusinessRuleViolationException("ERR-AB-016",
                    "Cannot perform emergency slaughter in status " + this.status);
        }
        this.status = SlaughterRecordStatus.EMERGENCY_SLAUGHTER;
        this.anteMortemNotes = reason;
        this.slaughteredAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    private void requireStatus(SlaughterRecordStatus required, String operation) {
        if (this.status != required) {
            throw new BusinessRuleViolationException("ERR-AB-009",
                    "Cannot perform " + operation + " in status " + this.status
                            + " (required: " + required + ")");
        }
    }

    public UUID getId() { return id; }
    public String getRecordCode() { return recordCode; }
    public UUID getSessionId() { return sessionId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getTagSerial() { return tagSerial; }
    public UUID getMovementPermitId() { return movementPermitId; }
    public String getOwnerCode() { return ownerCode; }
    public SlaughterRecordStatus getStatus() { return status; }
    public Instant getArrivedAt() { return arrivedAt; }
    public UUID getArrivedBy() { return arrivedBy; }
    public Boolean getTagVerified() { return tagVerified; }
    public Boolean getPermitVerified() { return permitVerified; }
    public AnteMortemDecision getAnteMortemDecision() { return anteMortemDecision; }
    public UUID getAnteMortemInspectedBy() { return anteMortemInspectedBy; }
    public Instant getAnteMortemAt() { return anteMortemAt; }
    public String getAnteMortemNotes() { return anteMortemNotes; }
    public String getHoldReason() { return holdReason; }
    public Instant getSlaughteredAt() { return slaughteredAt; }
    public UUID getSlaughteredBy() { return slaughteredBy; }
    public Integer getLairageHours() { return lairageHours; }
    public PostMortemDecision getPostMortemDecision() { return postMortemDecision; }
    public UUID getPostMortemInspectedBy() { return postMortemInspectedBy; }
    public Instant getPostMortemAt() { return postMortemAt; }
    public String getPostMortemNotes() { return postMortemNotes; }
    public String getCondemnationReason() { return condemnationReason; }
    public Boolean getCondemnedPartial() { return condemnedPartial; }
    public Long getVersion() { return version; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setMovementPermitId(UUID movementPermitId) { this.movementPermitId = movementPermitId; }
    public void setLairageHours(Integer lairageHours) { this.lairageHours = lairageHours; }
}
