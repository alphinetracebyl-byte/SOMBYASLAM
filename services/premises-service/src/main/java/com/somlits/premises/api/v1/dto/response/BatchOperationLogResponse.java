package com.somlits.premises.api.v1.dto.response;

import com.somlits.premises.domain.entity.BatchOperationLog;

import java.time.Instant;
import java.util.UUID;

public class BatchOperationLogResponse {

    private UUID id;
    private UUID batchId;
    private String operationType;
    private UUID performedBy;
    private Instant performedAt;
    private Integer affectedCount;
    private String details;
    private String notes;

    public static BatchOperationLogResponse from(BatchOperationLog log) {
        var r = new BatchOperationLogResponse();
        r.id = log.getId();
        r.batchId = log.getBatchId();
        r.operationType = log.getOperationType().name();
        r.performedBy = log.getPerformedBy();
        r.performedAt = log.getPerformedAt();
        r.affectedCount = log.getAffectedCount();
        r.details = log.getDetails();
        r.notes = log.getNotes();
        return r;
    }

    public UUID getId() { return id; }
    public UUID getBatchId() { return batchId; }
    public String getOperationType() { return operationType; }
    public UUID getPerformedBy() { return performedBy; }
    public Instant getPerformedAt() { return performedAt; }
    public Integer getAffectedCount() { return affectedCount; }
    public String getDetails() { return details; }
    public String getNotes() { return notes; }
}
