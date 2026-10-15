package com.somlits.premises.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "premises_status_history")
public class PremisesStatusHistory {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "premises_id", nullable = false)
    private UUID premisesId;

    @Column(name = "from_status", length = 30)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 30)
    private String toStatus;

    @Column(name = "changed_by", nullable = false)
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @Column(name = "reason")
    private String reason;

    protected PremisesStatusHistory() {}

    public static PremisesStatusHistory of(UUID premisesId, String fromStatus, String toStatus,
                                            UUID changedBy, String reason) {
        var h = new PremisesStatusHistory();
        h.id = UUID.randomUUID();
        h.premisesId = premisesId;
        h.fromStatus = fromStatus;
        h.toStatus = toStatus;
        h.changedBy = changedBy;
        h.changedAt = Instant.now();
        h.reason = reason;
        return h;
    }

    public UUID getId() { return id; }
    public UUID getPremisesId() { return premisesId; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public UUID getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
    public String getReason() { return reason; }
}
