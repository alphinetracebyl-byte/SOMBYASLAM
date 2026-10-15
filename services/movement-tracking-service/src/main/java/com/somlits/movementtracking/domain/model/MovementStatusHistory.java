package com.somlits.movementtracking.domain.model;

import com.somlits.movementtracking.domain.enums.MovementStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_status_history")
public class MovementStatusHistory {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "movement_id", nullable = false, updatable = false)
    private UUID movementId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 40)
    private MovementStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 40)
    private MovementStatus toStatus;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Column(name = "actor_role", nullable = false, length = 40)
    private String actorRole;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "offline_recorded", nullable = false)
    private boolean offlineRecorded = false;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    public static MovementStatusHistory of(UUID movementId, MovementStatus from,
                                            MovementStatus to, UUID actorId,
                                            String actorRole, String reason,
                                            boolean offlineRecorded) {
        var h = new MovementStatusHistory();
        h.id = UUID.randomUUID();
        h.movementId = movementId;
        h.fromStatus = from;
        h.toStatus = to;
        h.actorId = actorId;
        h.actorRole = actorRole;
        h.reason = reason;
        h.offlineRecorded = offlineRecorded;
        h.occurredAt = Instant.now();
        return h;
    }

    public UUID getId() { return id; }
    public UUID getMovementId() { return movementId; }
    public MovementStatus getFromStatus() { return fromStatus; }
    public MovementStatus getToStatus() { return toStatus; }
    public UUID getActorId() { return actorId; }
    public String getActorRole() { return actorRole; }
    public String getReason() { return reason; }
    public boolean isOfflineRecorded() { return offlineRecorded; }
    public Instant getOccurredAt() { return occurredAt; }
}
