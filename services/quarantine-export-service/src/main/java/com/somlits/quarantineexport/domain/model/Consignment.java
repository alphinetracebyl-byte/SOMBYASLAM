package com.somlits.quarantineexport.domain.model;

import com.somlits.quarantineexport.domain.enums.ConsignmentStatus;
import com.somlits.quarantineexport.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "consignment")
public class Consignment {

    private static final String ERR_STATUS = "ERR-QE-010";

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "consignment_code", nullable = false, unique = true, length = 20, updatable = false)
    private String consignmentCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ConsignmentStatus status;

    @Column(name = "exporter_owner_id", nullable = false)
    private UUID exporterOwnerId;

    @Column(name = "exporter_owner_code", nullable = false, length = 20)
    private String exporterOwnerCode;

    @Column(name = "destination_country", nullable = false, length = 100)
    private String destinationCountry;

    @Column(name = "quarantine_premises_id")
    private UUID quarantinePremisesId;

    @Column(name = "quarantine_premises_code", length = 20)
    private String quarantinePremisesCode;

    @Column(name = "proposed_export_date")
    private LocalDate proposedExportDate;

    @Column(name = "exit_point_premises_id")
    private UUID exitPointPremisesId;

    @Column(name = "exit_point_code", length = 20)
    private String exitPointCode;

    @Column(name = "total_animals", nullable = false)
    private int totalAnimals = 0;

    @Column(name = "animals_cleared", nullable = false)
    private int animalsCleared = 0;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "quarantine_started_at")
    private Instant quarantineStartedAt;

    @Column(name = "exported_at")
    private Instant exportedAt;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Consignment() {
        // JPA
    }

    public static Consignment create(UUID exporterOwnerId, String exporterOwnerCode,
                                     String destinationCountry, String consignmentCode, UUID createdBy) {
        Consignment c = new Consignment();
        c.id = UUID.randomUUID();
        c.consignmentCode = consignmentCode;
        c.exporterOwnerId = exporterOwnerId;
        c.exporterOwnerCode = exporterOwnerCode;
        c.destinationCountry = destinationCountry;
        c.createdBy = createdBy;
        c.status = ConsignmentStatus.DRAFT;
        c.createdAt = Instant.now();
        c.updatedAt = Instant.now();
        return c;
    }

    // --- State transitions ---

    public void submit() {
        if (this.status != ConsignmentStatus.DRAFT) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Consignment can only be submitted from DRAFT status. Current: " + this.status);
        }
        if (this.totalAnimals == 0) {
            throw new BusinessRuleViolationException("ERR-QE-011",
                    "Cannot submit a consignment with no animals");
        }
        this.status = ConsignmentStatus.SUBMITTED;
        this.submittedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void startQuarantine(UUID quarantinePremisesId, String quarantinePremisesCode) {
        if (this.status != ConsignmentStatus.SUBMITTED && this.status != ConsignmentStatus.QUARANTINE_PENDING) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Consignment must be SUBMITTED or QUARANTINE_PENDING to start quarantine. Current: " + this.status);
        }
        this.quarantinePremisesId = quarantinePremisesId;
        this.quarantinePremisesCode = quarantinePremisesCode;
        this.status = ConsignmentStatus.IN_QUARANTINE;
        this.quarantineStartedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void issueClearance() {
        if (this.status != ConsignmentStatus.IN_QUARANTINE && this.status != ConsignmentStatus.TESTING_IN_PROGRESS) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Consignment must be IN_QUARANTINE or TESTING_IN_PROGRESS to issue clearance. Current: " + this.status);
        }
        this.status = ConsignmentStatus.EXPORT_CLEARANCE_ISSUED;
        this.updatedAt = Instant.now();
    }

    public void export(Instant exportedAt) {
        if (this.status != ConsignmentStatus.EXPORT_CLEARANCE_ISSUED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Consignment must have EXPORT_CLEARANCE_ISSUED to confirm export. Current: " + this.status);
        }
        this.status = ConsignmentStatus.EXPORTED;
        this.exportedAt = exportedAt;
        this.updatedAt = Instant.now();
    }

    public void cancel(String reason) {
        if (this.status == ConsignmentStatus.EXPORTED || this.status == ConsignmentStatus.CANCELLED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Cannot cancel a consignment in status: " + this.status);
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleViolationException("ERR-QE-012",
                    "Cancellation reason is required");
        }
        this.status = ConsignmentStatus.CANCELLED;
        this.cancellationReason = reason;
        this.updatedAt = Instant.now();
    }

    public void incrementTotalAnimals(int count) {
        this.totalAnimals += count;
        this.updatedAt = Instant.now();
    }

    public void incrementAnimalsCleared(int count) {
        this.animalsCleared += count;
        this.updatedAt = Instant.now();
    }

    public void updateProposedExportDate(LocalDate date) {
        this.proposedExportDate = date;
        this.updatedAt = Instant.now();
    }

    public void updateExitPoint(UUID exitPointPremisesId, String exitPointCode) {
        this.exitPointPremisesId = exitPointPremisesId;
        this.exitPointCode = exitPointCode;
        this.updatedAt = Instant.now();
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public String getConsignmentCode() { return consignmentCode; }
    public ConsignmentStatus getStatus() { return status; }
    public UUID getExporterOwnerId() { return exporterOwnerId; }
    public String getExporterOwnerCode() { return exporterOwnerCode; }
    public String getDestinationCountry() { return destinationCountry; }
    public UUID getQuarantinePremisesId() { return quarantinePremisesId; }
    public String getQuarantinePremisesCode() { return quarantinePremisesCode; }
    public LocalDate getProposedExportDate() { return proposedExportDate; }
    public UUID getExitPointPremisesId() { return exitPointPremisesId; }
    public String getExitPointCode() { return exitPointCode; }
    public int getTotalAnimals() { return totalAnimals; }
    public int getAnimalsCleared() { return animalsCleared; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getQuarantineStartedAt() { return quarantineStartedAt; }
    public Instant getExportedAt() { return exportedAt; }
    public String getCancellationReason() { return cancellationReason; }
    public Long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
