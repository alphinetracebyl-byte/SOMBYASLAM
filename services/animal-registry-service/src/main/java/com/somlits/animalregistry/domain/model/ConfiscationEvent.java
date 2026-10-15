package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "confiscation_event")
public class ConfiscationEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "confiscation_date", nullable = false)
    private LocalDate confiscationDate;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "location_description")
    private String locationDescription;

    @Column(name = "enforcement_order_ref", nullable = false, length = 100)
    private String enforcementOrderRef;

    @Column(name = "enforcement_officer_id", nullable = false)
    private UUID enforcementOfficerId;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    @Column(name = "released_by")
    private UUID releasedBy;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Column(name = "release_reason")
    private String releaseReason;

    public static ConfiscationEvent create(UUID animalId, LocalDate confiscationDate, String reason,
                                           String locationDescription, String enforcementOrderRef,
                                           UUID enforcementOfficerId) {
        var e = new ConfiscationEvent();
        e.id = UUID.randomUUID();
        e.animalId = animalId;
        e.confiscationDate = confiscationDate;
        e.reason = reason;
        e.locationDescription = locationDescription;
        e.enforcementOrderRef = enforcementOrderRef;
        e.enforcementOfficerId = enforcementOfficerId;
        e.recordedAt = Instant.now();
        return e;
    }

    public void release(UUID releasedBy, String releaseReason) {
        this.releasedBy = releasedBy;
        this.releasedAt = Instant.now();
        this.releaseReason = releaseReason;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public LocalDate getConfiscationDate() { return confiscationDate; }
    public String getReason() { return reason; }
    public String getLocationDescription() { return locationDescription; }
    public String getEnforcementOrderRef() { return enforcementOrderRef; }
    public UUID getEnforcementOfficerId() { return enforcementOfficerId; }
    public Instant getRecordedAt() { return recordedAt; }
    public UUID getReleasedBy() { return releasedBy; }
    public Instant getReleasedAt() { return releasedAt; }
    public String getReleaseReason() { return releaseReason; }
}
