package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "animal_status_history")
public class AnimalStatusHistory {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(name = "reason")
    private String reason;

    @Column(name = "reference_event_id")
    private UUID referenceEventId;

    @Column(name = "triggered_by", nullable = false)
    private UUID triggeredBy;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    public static AnimalStatusHistory of(UUID animalId, String fromStatus, String toStatus,
                                         String reason, UUID referenceEventId, UUID triggeredBy) {
        var h = new AnimalStatusHistory();
        h.id = UUID.randomUUID();
        h.animalId = animalId;
        h.fromStatus = fromStatus;
        h.toStatus = toStatus;
        h.reason = reason;
        h.referenceEventId = referenceEventId;
        h.triggeredBy = triggeredBy;
        h.occurredAt = Instant.now();
        return h;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public String getReason() { return reason; }
    public UUID getReferenceEventId() { return referenceEventId; }
    public UUID getTriggeredBy() { return triggeredBy; }
    public Instant getOccurredAt() { return occurredAt; }
}
