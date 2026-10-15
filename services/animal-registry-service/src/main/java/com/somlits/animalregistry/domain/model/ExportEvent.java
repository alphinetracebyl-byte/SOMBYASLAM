package com.somlits.animalregistry.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "export_event")
public class ExportEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "export_date", nullable = false)
    private LocalDate exportDate;

    @Column(name = "border_post_id", nullable = false)
    private UUID borderPostId;

    @Column(name = "export_permit_ref", nullable = false, length = 100)
    private String exportPermitRef;

    @Column(name = "destination_country", nullable = false, length = 2)
    private String destinationCountry;

    @Column(name = "recorded_by", nullable = false)
    private UUID recordedBy;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    public static ExportEvent create(UUID animalId, LocalDate exportDate, UUID borderPostId,
                                     String exportPermitRef, String destinationCountry, UUID recordedBy) {
        var e = new ExportEvent();
        e.id = UUID.randomUUID();
        e.animalId = animalId;
        e.exportDate = exportDate;
        e.borderPostId = borderPostId;
        e.exportPermitRef = exportPermitRef;
        e.destinationCountry = destinationCountry;
        e.recordedBy = recordedBy;
        e.recordedAt = Instant.now();
        return e;
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public LocalDate getExportDate() { return exportDate; }
    public UUID getBorderPostId() { return borderPostId; }
    public String getExportPermitRef() { return exportPermitRef; }
    public String getDestinationCountry() { return destinationCountry; }
    public UUID getRecordedBy() { return recordedBy; }
    public Instant getRecordedAt() { return recordedAt; }
}
