package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "slaughter_event")
public class SlaughterEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "slaughter_date", nullable = false)
    private LocalDate slaughterDate;

    @Column(name = "abattoir_id", nullable = false)
    private UUID abattoirId;

    @Column(name = "slaughter_ref", nullable = false, length = 100)
    private String slaughterRef;

    @Column(name = "recorded_by", nullable = false)
    private UUID recordedBy;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    public static SlaughterEvent create(UUID animalId, LocalDate slaughterDate, UUID abattoirId,
                                        String slaughterRef, UUID recordedBy) {
        var e = new SlaughterEvent();
        e.id = UUID.randomUUID();
        e.animalId = animalId;
        e.slaughterDate = slaughterDate;
        e.abattoirId = abattoirId;
        e.slaughterRef = slaughterRef;
        e.recordedBy = recordedBy;
        e.recordedAt = Instant.now();
        return e;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public LocalDate getSlaughterDate() { return slaughterDate; }
    public UUID getAbattoirId() { return abattoirId; }
    public String getSlaughterRef() { return slaughterRef; }
    public UUID getRecordedBy() { return recordedBy; }
    public Instant getRecordedAt() { return recordedAt; }
}
