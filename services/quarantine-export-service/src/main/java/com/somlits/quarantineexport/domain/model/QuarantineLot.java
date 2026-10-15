package com.somlits.quarantineexport.domain.model;

import com.somlits.quarantineexport.domain.enums.QuarantineLotStatus;
import com.somlits.quarantineexport.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "quarantine_lot")
public class QuarantineLot {

    private static final String ERR_STATUS = "ERR-QE-020";

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "lot_code", nullable = false, unique = true, length = 20)
    private String lotCode;

    @Column(name = "consignment_id", nullable = false)
    private UUID consignmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private QuarantineLotStatus status;

    @Column(name = "start_date", nullable = false, updatable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "required_days", nullable = false)
    private int requiredDays;

    @Column(name = "test_requirements")
    private String testRequirements;

    @Column(name = "all_tests_passed")
    private Boolean allTestsPassed;

    @Column(name = "supervising_vet_id")
    private UUID supervisingVetId;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected QuarantineLot() {
        // JPA
    }

    public static QuarantineLot create(String lotCode, UUID consignmentId, LocalDate startDate,
                                       int requiredDays, UUID supervisingVetId, String testRequirements) {
        QuarantineLot lot = new QuarantineLot();
        lot.id = UUID.randomUUID();
        lot.lotCode = lotCode;
        lot.consignmentId = consignmentId;
        lot.status = QuarantineLotStatus.OPEN;
        lot.startDate = startDate;
        lot.requiredDays = requiredDays;
        lot.supervisingVetId = supervisingVetId;
        lot.testRequirements = testRequirements;
        lot.createdAt = Instant.now();
        return lot;
    }

    public void pass(LocalDate endDate) {
        if (this.status == QuarantineLotStatus.PASSED || this.status == QuarantineLotStatus.FAILED
                || this.status == QuarantineLotStatus.CLOSED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Quarantine lot cannot be passed from status: " + this.status);
        }
        this.status = QuarantineLotStatus.PASSED;
        this.endDate = endDate;
        this.allTestsPassed = Boolean.TRUE;
    }

    public void fail(LocalDate endDate) {
        if (this.status == QuarantineLotStatus.PASSED || this.status == QuarantineLotStatus.FAILED
                || this.status == QuarantineLotStatus.CLOSED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Quarantine lot cannot be failed from status: " + this.status);
        }
        this.status = QuarantineLotStatus.FAILED;
        this.endDate = endDate;
        this.allTestsPassed = Boolean.FALSE;
    }

    public void startTesting() {
        if (this.status != QuarantineLotStatus.OPEN) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Quarantine lot must be OPEN to start testing. Current: " + this.status);
        }
        this.status = QuarantineLotStatus.TESTING;
    }

    public void close() {
        this.status = QuarantineLotStatus.CLOSED;
    }

    public void appendNotes(String additionalNotes) {
        if (this.notes == null) {
            this.notes = additionalNotes;
        } else {
            this.notes = this.notes + "\n" + additionalNotes;
        }
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public String getLotCode() { return lotCode; }
    public UUID getConsignmentId() { return consignmentId; }
    public QuarantineLotStatus getStatus() { return status; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public int getRequiredDays() { return requiredDays; }
    public String getTestRequirements() { return testRequirements; }
    public Boolean getAllTestsPassed() { return allTestsPassed; }
    public UUID getSupervisingVetId() { return supervisingVetId; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
