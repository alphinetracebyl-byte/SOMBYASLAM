package com.somlits.vethealth.domain.entity;

import com.somlits.vethealth.domain.enums.MovementRestrictionStatus;
import com.somlits.vethealth.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.Year;
import java.util.UUID;

@Entity
@Table(name = "movement_restriction")
public class MovementRestriction {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "restriction_code", nullable = false, unique = true, length = 20, updatable = false)
    private String restrictionCode;

    @Column(name = "animal_id")
    private UUID animalId;

    @Column(name = "premises_id")
    private UUID premisesId;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "disease_suspected", length = 100)
    private String diseaseSuspected;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MovementRestrictionStatus status = MovementRestrictionStatus.ACTIVE;

    @Column(name = "imposed_by", nullable = false)
    private UUID imposedBy;

    @Column(name = "imposed_at", nullable = false, updatable = false)
    private Instant imposedAt;

    @Column(name = "lifted_by")
    private UUID liftedBy;

    @Column(name = "lifted_at")
    private Instant liftedAt;

    @Column(name = "lift_reason")
    private String liftReason;

    @Column(name = "expires_at")
    private Instant expiresAt;

    public static MovementRestriction create(String restrictionCode, UUID animalId, UUID premisesId,
                                              String reason, String diseaseSuspected,
                                              UUID imposedBy, Instant expiresAt) {
        var r = new MovementRestriction();
        r.id = UUID.randomUUID();
        r.restrictionCode = restrictionCode;
        r.animalId = animalId;
        r.premisesId = premisesId;
        r.reason = reason;
        r.diseaseSuspected = diseaseSuspected;
        r.status = MovementRestrictionStatus.ACTIVE;
        r.imposedBy = imposedBy;
        r.imposedAt = Instant.now();
        r.expiresAt = expiresAt;
        return r;
    }

    public static String generateCode(long sequence) {
        return "HMR-" + Year.now().getValue() + "-" + String.format("%06d", sequence);
    }

    public void lift(UUID liftedBy, String liftReason) {
        if (this.status != MovementRestrictionStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ERR-VH-010",
                    "Only ACTIVE restrictions can be lifted. Current status: " + this.status);
        }
        this.status = MovementRestrictionStatus.LIFTED;
        this.liftedBy = liftedBy;
        this.liftedAt = Instant.now();
        this.liftReason = liftReason;
    }

    public UUID getId() { return id; }
    public String getRestrictionCode() { return restrictionCode; }
    public UUID getAnimalId() { return animalId; }
    public UUID getPremisesId() { return premisesId; }
    public String getReason() { return reason; }
    public String getDiseaseSuspected() { return diseaseSuspected; }
    public MovementRestrictionStatus getStatus() { return status; }
    public UUID getImposedBy() { return imposedBy; }
    public Instant getImposedAt() { return imposedAt; }
    public UUID getLiftedBy() { return liftedBy; }
    public Instant getLiftedAt() { return liftedAt; }
    public String getLiftReason() { return liftReason; }
    public Instant getExpiresAt() { return expiresAt; }
}
