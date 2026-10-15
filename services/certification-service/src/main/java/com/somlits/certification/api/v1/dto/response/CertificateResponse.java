package com.somlits.certification.api.v1.dto.response;

import com.somlits.certification.domain.model.Certificate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class CertificateResponse {

    private UUID id;
    private String certificateNumber;
    private String certificateType;
    private String status;
    private UUID templateId;
    private UUID subjectAnimalId;
    private String subjectAnimalCode;
    private UUID subjectConsignmentId;
    private UUID subjectMovementId;
    private UUID issuedBy;
    private String issuedByName;
    private Instant issuedAt;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private String qrCode;
    private String digitalSignatureHash;
    private UUID revokedBy;
    private Instant revokedAt;
    private String revocationReason;
    private String replacedByCertNumber;
    private Long version;
    private Instant updatedAt;

    public static CertificateResponse from(Certificate c) {
        CertificateResponse r = new CertificateResponse();
        r.id = c.getId();
        r.certificateNumber = c.getCertificateNumber();
        r.certificateType = c.getCertificateType().name();
        r.status = c.getStatus().name();
        r.templateId = c.getTemplateId();
        r.subjectAnimalId = c.getSubjectAnimalId();
        r.subjectAnimalCode = c.getSubjectAnimalCode();
        r.subjectConsignmentId = c.getSubjectConsignmentId();
        r.subjectMovementId = c.getSubjectMovementId();
        r.issuedBy = c.getIssuedBy();
        r.issuedByName = c.getIssuedByName();
        r.issuedAt = c.getIssuedAt();
        r.validFrom = c.getValidFrom();
        r.validUntil = c.getValidUntil();
        r.qrCode = c.getQrCode();
        r.digitalSignatureHash = c.getDigitalSignatureHash();
        r.revokedBy = c.getRevokedBy();
        r.revokedAt = c.getRevokedAt();
        r.revocationReason = c.getRevocationReason();
        r.replacedByCertNumber = c.getReplacedByCertNumber();
        r.version = c.getVersion();
        r.updatedAt = c.getUpdatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getCertificateNumber() { return certificateNumber; }
    public String getCertificateType() { return certificateType; }
    public String getStatus() { return status; }
    public UUID getTemplateId() { return templateId; }
    public UUID getSubjectAnimalId() { return subjectAnimalId; }
    public String getSubjectAnimalCode() { return subjectAnimalCode; }
    public UUID getSubjectConsignmentId() { return subjectConsignmentId; }
    public UUID getSubjectMovementId() { return subjectMovementId; }
    public UUID getIssuedBy() { return issuedBy; }
    public String getIssuedByName() { return issuedByName; }
    public Instant getIssuedAt() { return issuedAt; }
    public LocalDate getValidFrom() { return validFrom; }
    public LocalDate getValidUntil() { return validUntil; }
    public String getQrCode() { return qrCode; }
    public String getDigitalSignatureHash() { return digitalSignatureHash; }
    public UUID getRevokedBy() { return revokedBy; }
    public Instant getRevokedAt() { return revokedAt; }
    public String getRevocationReason() { return revocationReason; }
    public String getReplacedByCertNumber() { return replacedByCertNumber; }
    public Long getVersion() { return version; }
    public Instant getUpdatedAt() { return updatedAt; }
}
