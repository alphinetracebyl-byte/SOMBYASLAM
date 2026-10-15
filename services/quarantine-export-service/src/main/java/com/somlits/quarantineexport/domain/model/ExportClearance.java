package com.somlits.quarantineexport.domain.model;

import com.somlits.quarantineexport.domain.enums.ClearanceStatus;
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
@Table(name = "export_clearance")
public class ExportClearance {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "clearance_code", nullable = false, unique = true, length = 20, updatable = false)
    private String clearanceCode;

    @Column(name = "consignment_id", nullable = false)
    private UUID consignmentId;

    @Column(name = "animal_id")
    private UUID animalId;

    @Column(name = "clearance_date", nullable = false)
    private LocalDate clearanceDate;

    @Column(name = "issued_by", nullable = false)
    private UUID issuedBy;

    @Column(name = "valid_until", nullable = false)
    private LocalDate validUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ClearanceStatus status;

    @Column(name = "revoked_by")
    private UUID revokedBy;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected ExportClearance() {
        // JPA
    }

    public static ExportClearance issue(String clearanceCode, UUID consignmentId, UUID animalId,
                                        LocalDate clearanceDate, LocalDate validUntil, UUID issuedBy) {
        ExportClearance ec = new ExportClearance();
        ec.id = UUID.randomUUID();
        ec.clearanceCode = clearanceCode;
        ec.consignmentId = consignmentId;
        ec.animalId = animalId;
        ec.clearanceDate = clearanceDate;
        ec.validUntil = validUntil;
        ec.issuedBy = issuedBy;
        ec.status = ClearanceStatus.ISSUED;
        return ec;
    }

    public void revoke(UUID revokedBy) {
        if (this.status != ClearanceStatus.ISSUED) {
            throw new BusinessRuleViolationException("ERR-QE-030",
                    "Only ISSUED clearances can be revoked. Current: " + this.status);
        }
        this.status = ClearanceStatus.REVOKED;
        this.revokedBy = revokedBy;
        this.revokedAt = Instant.now();
    }

    public void expire() {
        if (this.status == ClearanceStatus.ISSUED) {
            this.status = ClearanceStatus.EXPIRED;
        }
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public String getClearanceCode() { return clearanceCode; }
    public UUID getConsignmentId() { return consignmentId; }
    public UUID getAnimalId() { return animalId; }
    public LocalDate getClearanceDate() { return clearanceDate; }
    public UUID getIssuedBy() { return issuedBy; }
    public LocalDate getValidUntil() { return validUntil; }
    public ClearanceStatus getStatus() { return status; }
    public UUID getRevokedBy() { return revokedBy; }
    public Instant getRevokedAt() { return revokedAt; }
}
