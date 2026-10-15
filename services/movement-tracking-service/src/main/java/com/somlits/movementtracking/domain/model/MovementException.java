package com.somlits.movementtracking.domain.model;

import com.somlits.movementtracking.domain.enums.MovementExceptionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_exception")
public class MovementException {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "movement_id", nullable = false, updatable = false)
    private UUID movementId;

    @Enumerated(EnumType.STRING)
    @Column(name = "exception_type", nullable = false, length = 40)
    private MovementExceptionType exceptionType;

    @Column(name = "animal_id")
    private UUID animalId;

    @Column(name = "animal_code", length = 25)
    private String animalCode;

    @Column(name = "tag_serial_found", length = 50)
    private String tagSerialFound;

    @Column(name = "notes", nullable = false, length = 500)
    private String notes;

    @Column(name = "resolved", nullable = false)
    private boolean resolved = false;

    @Column(name = "resolution_notes", length = 500)
    private String resolutionNotes;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "reported_by", nullable = false)
    private UUID reportedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static MovementException of(UUID movementId, MovementExceptionType type,
                                        UUID animalId, String animalCode, String tagSerialFound,
                                        String notes, UUID reportedBy) {
        var e = new MovementException();
        e.id = UUID.randomUUID();
        e.movementId = movementId;
        e.exceptionType = type;
        e.animalId = animalId;
        e.animalCode = animalCode;
        e.tagSerialFound = tagSerialFound;
        e.notes = notes;
        e.reportedBy = reportedBy;
        e.resolved = false;
        e.createdAt = Instant.now();
        return e;
    }

    public void resolve(UUID resolvedBy, String resolutionNotes) {
        this.resolved = true;
        this.resolvedBy = resolvedBy;
        this.resolutionNotes = resolutionNotes;
        this.resolvedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getMovementId() { return movementId; }
    public MovementExceptionType getExceptionType() { return exceptionType; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getTagSerialFound() { return tagSerialFound; }
    public String getNotes() { return notes; }
    public boolean isResolved() { return resolved; }
    public String getResolutionNotes() { return resolutionNotes; }
    public UUID getResolvedBy() { return resolvedBy; }
    public Instant getResolvedAt() { return resolvedAt; }
    public UUID getReportedBy() { return reportedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
