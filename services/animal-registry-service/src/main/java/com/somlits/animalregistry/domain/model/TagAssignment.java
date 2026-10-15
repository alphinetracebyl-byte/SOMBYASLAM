package com.somlits.animalregistry.domain.model;

import com.somlits.animalregistry.domain.enums.TagAssignmentStatus;
import com.somlits.animalregistry.domain.enums.TagCloseReason;
import com.somlits.animalregistry.domain.enums.TagReplacementReason;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_assignment")
public class TagAssignment {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "tag_serial", nullable = false, length = 50)
    private String tagSerial;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TagAssignmentStatus status = TagAssignmentStatus.ACTIVE;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;

    @Column(name = "assigned_by", nullable = false, updatable = false)
    private UUID assignedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "close_reason", length = 30)
    private TagCloseReason closeReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "replacement_reason", length = 20)
    private TagReplacementReason replacementReason;

    @Column(name = "new_serial_is_same", nullable = false)
    private boolean newSerialIsSame = false;

    @Column(name = "linked_replacement_id")
    private UUID linkedReplacementId;

    public static TagAssignment create(UUID animalId, String tagSerial, UUID assignedBy) {
        var t = new TagAssignment();
        t.id = UUID.randomUUID();
        t.animalId = animalId;
        t.tagSerial = tagSerial;
        t.status = TagAssignmentStatus.ACTIVE;
        t.assignedAt = Instant.now();
        t.assignedBy = assignedBy;
        return t;
    }

    public void replace(TagReplacementReason reason, boolean sameSerial, UUID replacementId) {
        this.status = TagAssignmentStatus.REPLACED;
        this.closeReason = TagCloseReason.REPLACED;
        this.replacementReason = reason;
        this.newSerialIsSame = sameSerial;
        this.linkedReplacementId = replacementId;
        this.closedAt = Instant.now();
    }

    public void retire(TagCloseReason reason) {
        this.status = TagAssignmentStatus.RETIRED;
        this.closeReason = reason;
        this.closedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getAnimalId() { return animalId; }
    public String getTagSerial() { return tagSerial; }
    public TagAssignmentStatus getStatus() { return status; }
    public Instant getAssignedAt() { return assignedAt; }
    public UUID getAssignedBy() { return assignedBy; }
    public Instant getClosedAt() { return closedAt; }
    public TagCloseReason getCloseReason() { return closeReason; }
    public TagReplacementReason getReplacementReason() { return replacementReason; }
    public boolean isNewSerialIsSame() { return newSerialIsSame; }
    public UUID getLinkedReplacementId() { return linkedReplacementId; }
}
