package com.somlits.quarantineexport.api.v1.dto.response;

import com.somlits.quarantineexport.domain.model.Consignment;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class ConsignmentResponse {

    private UUID id;
    private String consignmentCode;
    private String status;
    private UUID exporterOwnerId;
    private String exporterOwnerCode;
    private String destinationCountry;
    private UUID quarantinePremisesId;
    private String quarantinePremisesCode;
    private LocalDate proposedExportDate;
    private UUID exitPointPremisesId;
    private String exitPointCode;
    private int totalAnimals;
    private int animalsCleared;
    private UUID createdBy;
    private Instant submittedAt;
    private Instant quarantineStartedAt;
    private Instant exportedAt;
    private String cancellationReason;
    private Long version;
    private Instant createdAt;
    private Instant updatedAt;

    public static ConsignmentResponse from(Consignment c) {
        ConsignmentResponse r = new ConsignmentResponse();
        r.id = c.getId();
        r.consignmentCode = c.getConsignmentCode();
        r.status = c.getStatus().name();
        r.exporterOwnerId = c.getExporterOwnerId();
        r.exporterOwnerCode = c.getExporterOwnerCode();
        r.destinationCountry = c.getDestinationCountry();
        r.quarantinePremisesId = c.getQuarantinePremisesId();
        r.quarantinePremisesCode = c.getQuarantinePremisesCode();
        r.proposedExportDate = c.getProposedExportDate();
        r.exitPointPremisesId = c.getExitPointPremisesId();
        r.exitPointCode = c.getExitPointCode();
        r.totalAnimals = c.getTotalAnimals();
        r.animalsCleared = c.getAnimalsCleared();
        r.createdBy = c.getCreatedBy();
        r.submittedAt = c.getSubmittedAt();
        r.quarantineStartedAt = c.getQuarantineStartedAt();
        r.exportedAt = c.getExportedAt();
        r.cancellationReason = c.getCancellationReason();
        r.version = c.getVersion();
        r.createdAt = c.getCreatedAt();
        r.updatedAt = c.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getConsignmentCode() { return consignmentCode; }
    public String getStatus() { return status; }
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
