package com.somlits.certification.api.v1.dto.response;

import java.time.Instant;
import java.time.LocalDate;

public class VerificationResponse {

    private boolean valid;
    private String certificateNumber;
    private String type;
    private String status;
    private Instant issuedAt;
    private LocalDate validUntil;
    private String subjectAnimalCode;
    private String verificationResult;

    public static VerificationResponse from(
            com.somlits.certification.application.service.CertificationService.VerificationResponse vr) {
        VerificationResponse r = new VerificationResponse();
        r.valid = vr.valid();
        r.certificateNumber = vr.certificateNumber();
        r.type = vr.type();
        r.status = vr.status();
        r.issuedAt = vr.issuedAt();
        r.validUntil = vr.validUntil();
        r.subjectAnimalCode = vr.subjectAnimalCode();
        r.verificationResult = vr.verificationResult().name();
        return r;
    }

    public boolean isValid() { return valid; }
    public String getCertificateNumber() { return certificateNumber; }
    public String getType() { return type; }
    public String getStatus() { return status; }
    public Instant getIssuedAt() { return issuedAt; }
    public LocalDate getValidUntil() { return validUntil; }
    public String getSubjectAnimalCode() { return subjectAnimalCode; }
    public String getVerificationResult() { return verificationResult; }
}
