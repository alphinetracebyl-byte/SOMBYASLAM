package com.somlits.vethealth.domain.entity;

import com.somlits.vethealth.domain.enums.SampleStatus;
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
@Table(name = "sample")
public class Sample {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "sample_code", nullable = false, unique = true, length = 20, updatable = false)
    private String sampleCode;

    @Column(name = "health_event_id", nullable = false)
    private UUID healthEventId;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 30)
    private String animalCode;

    @Column(name = "sample_type", nullable = false, length = 30)
    private String sampleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SampleStatus status = SampleStatus.COLLECTED;

    @Column(name = "collected_by", nullable = false)
    private UUID collectedBy;

    @Column(name = "collected_at", nullable = false, updatable = false)
    private Instant collectedAt;

    @Column(name = "laboratory_id")
    private UUID laboratoryId;

    @Column(name = "laboratory_code", length = 30)
    private String laboratoryCode;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "result_received_at")
    private Instant resultReceivedAt;

    @Column(name = "lab_result", length = 30)
    private String labResult;

    @Column(name = "lab_notes")
    private String labNotes;

    @Column(name = "linked_disease_case_id")
    private UUID linkedDiseaseCaseId;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static Sample create(String sampleCode, UUID healthEventId, UUID animalId,
                                String animalCode, String sampleType, UUID collectedBy) {
        var s = new Sample();
        s.id = UUID.randomUUID();
        s.sampleCode = sampleCode;
        s.healthEventId = healthEventId;
        s.animalId = animalId;
        s.animalCode = animalCode;
        s.sampleType = sampleType;
        s.status = SampleStatus.COLLECTED;
        s.collectedBy = collectedBy;
        s.collectedAt = Instant.now();
        return s;
    }

    public static String generateCode(long sequence) {
        return "SMP-" + Year.now().getValue() + "-" + String.format("%06d", sequence);
    }

    public void recordLabResult(String labResult, String labNotes, UUID laboratoryId, String laboratoryCode) {
        if (this.status == SampleStatus.REJECTED) {
            throw new BusinessRuleViolationException("ERR-VH-040",
                    "Cannot record result for a rejected sample");
        }
        this.labResult = labResult;
        this.labNotes = labNotes;
        this.laboratoryId = laboratoryId;
        this.laboratoryCode = laboratoryCode;
        this.status = SampleStatus.RESULT_RECEIVED;
        this.resultReceivedAt = Instant.now();
    }

    public void submitToLab(UUID laboratoryId, String laboratoryCode) {
        if (this.status != SampleStatus.COLLECTED) {
            throw new BusinessRuleViolationException("ERR-VH-041",
                    "Only COLLECTED samples can be submitted to a lab. Current status: " + this.status);
        }
        this.laboratoryId = laboratoryId;
        this.laboratoryCode = laboratoryCode;
        this.status = SampleStatus.SUBMITTED_TO_LAB;
        this.submittedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getSampleCode() { return sampleCode; }
    public UUID getHealthEventId() { return healthEventId; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getSampleType() { return sampleType; }
    public SampleStatus getStatus() { return status; }
    public UUID getCollectedBy() { return collectedBy; }
    public Instant getCollectedAt() { return collectedAt; }
    public UUID getLaboratoryId() { return laboratoryId; }
    public String getLaboratoryCode() { return laboratoryCode; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getResultReceivedAt() { return resultReceivedAt; }
    public String getLabResult() { return labResult; }
    public String getLabNotes() { return labNotes; }
    public UUID getLinkedDiseaseCaseId() { return linkedDiseaseCaseId; }
    public int getVersion() { return version; }

    public void setLinkedDiseaseCaseId(UUID linkedDiseaseCaseId) { this.linkedDiseaseCaseId = linkedDiseaseCaseId; }
}
