package com.somlits.animalregistry.api.v1.dto.response;

import com.somlits.animalregistry.domain.model.RegistrationSubmission;

import java.time.Instant;
import java.util.UUID;

public class RegistrationResponse {
    private UUID submissionId;
    private String submissionCode;
    private UUID animalId;
    private String animalCode;
    private String submissionType;
    private String status;
    private Instant submittedAt;
    private String rejectionReason;
    private String officerNotes;

    public static RegistrationResponse from(RegistrationSubmission s, String animalCode) {
        var r = new RegistrationResponse();
        r.submissionId = s.getId();
        r.submissionCode = s.getSubmissionCode();
        r.animalId = s.getAnimalId();
        r.animalCode = animalCode;
        r.submissionType = s.getSubmissionType().name();
        r.status = s.getStatus().name();
        r.submittedAt = s.getSubmittedAt();
        r.rejectionReason = s.getRejectionReason();
        r.officerNotes = s.getOfficerNotes();
        return r;
    }

    public UUID getSubmissionId() { return submissionId; }
    public String getSubmissionCode() { return submissionCode; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public String getSubmissionType() { return submissionType; }
    public String getStatus() { return status; }
    public Instant getSubmittedAt() { return submittedAt; }
    public String getRejectionReason() { return rejectionReason; }
    public String getOfficerNotes() { return officerNotes; }
}
