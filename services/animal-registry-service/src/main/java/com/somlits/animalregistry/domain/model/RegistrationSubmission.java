package com.somlits.animalregistry.domain.model;

import com.somlits.animalregistry.domain.enums.SourceType;
import com.somlits.animalregistry.domain.enums.SubmissionStatus;
import com.somlits.animalregistry.domain.enums.SubmissionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "registration_submission")
public class RegistrationSubmission {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "submission_code", nullable = false, unique = true, length = 30, updatable = false)
    private String submissionCode;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_type", nullable = false, length = 20)
    private SubmissionType submissionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 20)
    private SourceType sourceType;

    @Column(name = "source_description")
    private String sourceDescription;

    @Column(name = "import_permit_number", length = 100)
    private String importPermitNumber;

    @Column(name = "country_of_origin", length = 2)
    private String countryOfOrigin;

    @Column(name = "foreign_id_number", length = 100)
    private String foreignIdNumber;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "officer_notes")
    private String officerNotes;

    @Column(name = "idempotency_key", nullable = false, unique = true, updatable = false)
    private UUID idempotencyKey;

    public static RegistrationSubmission create(String submissionCode, UUID animalId,
                                                SubmissionType submissionType, UUID submittedBy,
                                                UUID idempotencyKey) {
        var s = new RegistrationSubmission();
        s.id = UUID.randomUUID();
        s.submissionCode = submissionCode;
        s.animalId = animalId;
        s.submissionType = submissionType;
        s.status = SubmissionStatus.SUBMITTED;
        s.submittedBy = submittedBy;
        s.submittedAt = Instant.now();
        s.idempotencyKey = idempotencyKey;
        return s;
    }

    public void verify(UUID officerId, String notes) {
        this.status = SubmissionStatus.VERIFIED;
        this.reviewedBy = officerId;
        this.reviewedAt = Instant.now();
        this.officerNotes = notes;
    }

    public void reject(UUID officerId, String reason) {
        this.status = SubmissionStatus.REJECTED;
        this.reviewedBy = officerId;
        this.reviewedAt = Instant.now();
        this.rejectionReason = reason;
    }

    public UUID getId() { return id; }
    public String getSubmissionCode() { return submissionCode; }
    public UUID getAnimalId() { return animalId; }
    public SubmissionType getSubmissionType() { return submissionType; }
    public SubmissionStatus getStatus() { return status; }
    public SourceType getSourceType() { return sourceType; }
    public void setSourceType(SourceType t) { this.sourceType = t; }
    public String getSourceDescription() { return sourceDescription; }
    public void setSourceDescription(String d) { this.sourceDescription = d; }
    public String getImportPermitNumber() { return importPermitNumber; }
    public void setImportPermitNumber(String n) { this.importPermitNumber = n; }
    public String getCountryOfOrigin() { return countryOfOrigin; }
    public void setCountryOfOrigin(String c) { this.countryOfOrigin = c; }
    public String getForeignIdNumber() { return foreignIdNumber; }
    public void setForeignIdNumber(String f) { this.foreignIdNumber = f; }
    public UUID getSubmittedBy() { return submittedBy; }
    public Instant getSubmittedAt() { return submittedAt; }
    public UUID getReviewedBy() { return reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getRejectionReason() { return rejectionReason; }
    public String getOfficerNotes() { return officerNotes; }
    public UUID getIdempotencyKey() { return idempotencyKey; }
}
