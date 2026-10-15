package com.somlits.vethealth.domain.entity;

import com.somlits.vethealth.domain.enums.DiseaseStatus;
import com.somlits.vethealth.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.Year;
import java.util.UUID;

@Entity
@Table(name = "disease_case")
public class DiseaseCase {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "case_code", nullable = false, unique = true, length = 20, updatable = false)
    private String caseCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DiseaseStatus status = DiseaseStatus.SUSPECTED;

    @Column(name = "disease", nullable = false, length = 200)
    private String disease;

    @Column(name = "suspected_premises_id")
    private UUID suspectedPremisesId;

    @Column(name = "suspected_animal_ids", columnDefinition = "TEXT")
    private String suspectedAnimalIds;

    @Column(name = "reported_by", nullable = false)
    private UUID reportedBy;

    @Column(name = "reported_at", nullable = false, updatable = false)
    private Instant reportedAt;

    @Column(name = "investigating_vet_id")
    private UUID investigatingVetId;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closure_notes")
    private String closureNotes;

    @Column(name = "outbreak_declared", nullable = false)
    private Boolean outbreakDeclared = false;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static DiseaseCase create(String caseCode, String disease, UUID suspectedPremisesId,
                                     String suspectedAnimalIds, UUID reportedBy) {
        var dc = new DiseaseCase();
        dc.id = UUID.randomUUID();
        dc.caseCode = caseCode;
        dc.status = DiseaseStatus.SUSPECTED;
        dc.disease = disease;
        dc.suspectedPremisesId = suspectedPremisesId;
        dc.suspectedAnimalIds = suspectedAnimalIds;
        dc.reportedBy = reportedBy;
        dc.reportedAt = Instant.now();
        dc.outbreakDeclared = false;
        return dc;
    }

    public static String generateCode(long sequence) {
        return "DC-" + Year.now().getValue() + "-" + String.format("%06d", sequence);
    }

    public void confirm(UUID investigatingVetId) {
        if (this.status != DiseaseStatus.SUSPECTED && this.status != DiseaseStatus.INCONCLUSIVE) {
            throw new BusinessRuleViolationException("ERR-VH-030",
                    "Cannot confirm case in status: " + this.status);
        }
        this.status = DiseaseStatus.CONFIRMED;
        this.investigatingVetId = investigatingVetId;
        this.confirmedAt = Instant.now();
    }

    public void close(String closureNotes) {
        if (this.status == DiseaseStatus.CLOSED) {
            throw new BusinessRuleViolationException("ERR-VH-031",
                    "Disease case is already closed");
        }
        this.status = DiseaseStatus.CLOSED;
        this.closureNotes = closureNotes;
        this.closedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getCaseCode() { return caseCode; }
    public DiseaseStatus getStatus() { return status; }
    public String getDisease() { return disease; }
    public UUID getSuspectedPremisesId() { return suspectedPremisesId; }
    public String getSuspectedAnimalIds() { return suspectedAnimalIds; }
    public UUID getReportedBy() { return reportedBy; }
    public Instant getReportedAt() { return reportedAt; }
    public UUID getInvestigatingVetId() { return investigatingVetId; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public Instant getClosedAt() { return closedAt; }
    public String getClosureNotes() { return closureNotes; }
    public Boolean getOutbreakDeclared() { return outbreakDeclared; }
    public int getVersion() { return version; }

    public void setInvestigatingVetId(UUID investigatingVetId) { this.investigatingVetId = investigatingVetId; }
    public void setSuspectedPremisesId(UUID suspectedPremisesId) { this.suspectedPremisesId = suspectedPremisesId; }
    public void setSuspectedAnimalIds(String suspectedAnimalIds) { this.suspectedAnimalIds = suspectedAnimalIds; }
    public void setOutbreakDeclared(Boolean outbreakDeclared) { this.outbreakDeclared = outbreakDeclared; }
    public void setStatus(DiseaseStatus status) { this.status = status; }
}
