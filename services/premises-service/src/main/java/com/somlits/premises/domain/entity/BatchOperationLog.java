package com.somlits.premises.domain.entity;

import com.somlits.premises.domain.enums.BatchOperationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "batch_operation_log")
public class BatchOperationLog {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "batch_id", nullable = false, updatable = false)
    private UUID batchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 30)
    private BatchOperationType operationType;

    @Column(name = "performed_by", nullable = false, updatable = false)
    private UUID performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt;

    @Column(name = "affected_count", nullable = false)
    private Integer affectedCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private String details;

    @Column(name = "notes")
    private String notes;

    protected BatchOperationLog() {}

    public static BatchOperationLog of(UUID batchId, BatchOperationType operationType,
                                       UUID performedBy, int affectedCount,
                                       String details, String notes) {
        var log = new BatchOperationLog();
        log.id = UUID.randomUUID();
        log.batchId = batchId;
        log.operationType = operationType;
        log.performedBy = performedBy;
        log.performedAt = Instant.now();
        log.affectedCount = affectedCount;
        log.details = details;
        log.notes = notes;
        return log;
    }

    public UUID getId() { return id; }
    public UUID getBatchId() { return batchId; }
    public BatchOperationType getOperationType() { return operationType; }
    public UUID getPerformedBy() { return performedBy; }
    public Instant getPerformedAt() { return performedAt; }
    public Integer getAffectedCount() { return affectedCount; }
    public String getDetails() { return details; }
    public String getNotes() { return notes; }
}
