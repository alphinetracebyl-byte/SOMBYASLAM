package com.somlits.movementtracking.domain.model;

import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_rule")
public class MovementRule {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "rule_code", nullable = false, unique = true, length = 30, updatable = false)
    private String ruleCode;

    @Column(name = "origin_premises_type", nullable = false, length = 40)
    private String originPremisesType;

    @Enumerated(EnumType.STRING)
    @Column(name = "destination_type", nullable = false, length = 40)
    private DestinationType destinationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_purpose", nullable = false, length = 40)
    private MovementPurpose movementPurpose;

    @Column(name = "permitted", nullable = false)
    private boolean permitted;

    @Column(name = "requires_vet_review", nullable = false)
    private boolean requiresVetReview;

    @Column(name = "permit_validity_hours", nullable = false)
    private int permitValidityHours;

    @Column(name = "mixed_species_allowed", nullable = false)
    private boolean mixedSpeciesAllowed = false;

    @Column(name = "cross_border", nullable = false)
    private boolean crossBorder = false;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static MovementRule create(String ruleCode, String originPremisesType,
                                       DestinationType destinationType, MovementPurpose purpose,
                                       boolean permitted, boolean requiresVetReview,
                                       int permitValidityHours, boolean mixedSpeciesAllowed,
                                       boolean crossBorder, String notes, UUID createdBy) {
        var r = new MovementRule();
        r.id = UUID.randomUUID();
        r.ruleCode = ruleCode;
        r.originPremisesType = originPremisesType;
        r.destinationType = destinationType;
        r.movementPurpose = purpose;
        r.permitted = permitted;
        r.requiresVetReview = requiresVetReview;
        r.permitValidityHours = permitValidityHours;
        r.mixedSpeciesAllowed = mixedSpeciesAllowed;
        r.crossBorder = crossBorder;
        r.notes = notes;
        r.active = true;
        r.createdBy = createdBy;
        r.createdAt = Instant.now();
        r.updatedAt = Instant.now();
        return r;
    }

    public void deactivate(UUID actorId) {
        this.active = false;
        this.updatedAt = Instant.now();
    }

    public void update(boolean permitted, boolean requiresVetReview,
                       int permitValidityHours, boolean mixedSpeciesAllowed, String notes) {
        this.permitted = permitted;
        this.requiresVetReview = requiresVetReview;
        this.permitValidityHours = permitValidityHours;
        this.mixedSpeciesAllowed = mixedSpeciesAllowed;
        this.notes = notes;
        this.updatedAt = Instant.now();
    }

    public void assertPermitted() {
        if (!permitted) {
            throw new BusinessRuleViolationException("ERR-MT-010",
                    "Movement from " + originPremisesType + " to " + destinationType
                            + " for purpose " + movementPurpose + " is not permitted by national rules.");
        }
    }

    public UUID getId() { return id; }
    public String getRuleCode() { return ruleCode; }
    public String getOriginPremisesType() { return originPremisesType; }
    public DestinationType getDestinationType() { return destinationType; }
    public MovementPurpose getMovementPurpose() { return movementPurpose; }
    public boolean isPermitted() { return permitted; }
    public boolean isRequiresVetReview() { return requiresVetReview; }
    public int getPermitValidityHours() { return permitValidityHours; }
    public boolean isMixedSpeciesAllowed() { return mixedSpeciesAllowed; }
    public boolean isCrossBorder() { return crossBorder; }
    public String getNotes() { return notes; }
    public boolean isActive() { return active; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public int getVersion() { return version; }
}
