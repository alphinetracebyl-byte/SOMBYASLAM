package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "death_event")
public class DeathEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "death_date", nullable = false)
    private LocalDate deathDate;

    @Column(name = "cause_of_death", length = 100)
    private String causeOfDeath;

    @Column(name = "location_description")
    private String locationDescription;

    @Column(name = "photo_id")
    private UUID photoId;

    @Column(name = "notes")
    private String notes;

    @Column(name = "recorded_by", nullable = false)
    private UUID recordedBy;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    public static DeathEvent create(UUID animalId, LocalDate deathDate, String causeOfDeath,
                                    String locationDescription, UUID photoId, String notes,
                                    UUID recordedBy) {
        var e = new DeathEvent();
        e.id = UUID.randomUUID();
        e.animalId = animalId;
        e.deathDate = deathDate;
        e.causeOfDeath = causeOfDeath;
        e.locationDescription = locationDescription;
        e.photoId = photoId;
        e.notes = notes;
        e.recordedBy = recordedBy;
        e.recordedAt = Instant.now();
        return e;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public LocalDate getDeathDate() { return deathDate; }
    public String getCauseOfDeath() { return causeOfDeath; }
    public String getLocationDescription() { return locationDescription; }
    public UUID getPhotoId() { return photoId; }
    public String getNotes() { return notes; }
    public UUID getRecordedBy() { return recordedBy; }
    public Instant getRecordedAt() { return recordedAt; }
}
