package com.somlits.certification.domain.model;

import com.somlits.certification.domain.enums.CertificateStatus;
import com.somlits.certification.domain.enums.CertificateType;
import com.somlits.certification.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "certificate")
public class Certificate {

    private static final String ERR_STATUS = "ERR-CERT-020";

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "certificate_number", nullable = false, unique = true, length = 30, updatable = false)
    private String certificateNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "certificate_type", nullable = false, length = 40, updatable = false)
    private CertificateType certificateType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CertificateStatus status;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "subject_animal_id")
    private UUID subjectAnimalId;

    @Column(name = "subject_animal_code", length = 30)
    private String subjectAnimalCode;

    @Column(name = "subject_consignment_id")
    private UUID subjectConsignmentId;

    @Column(name = "subject_movement_id")
    private UUID subjectMovementId;

    @Column(name = "issued_by", nullable = false, updatable = false)
    private UUID issuedBy;

    @Column(name = "issued_by_name", nullable = false, length = 200, updatable = false)
    private String issuedByName;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "qr_code", nullable = false, unique = true, length = 50, updatable = false)
    private String qrCode;

    @Column(name = "template_data", columnDefinition = "TEXT")
    private String templateData;

    @Column(name = "digital_signature_hash", length = 200)
    private String digitalSignatureHash;

    @Column(name = "revoked_by")
    private UUID revokedBy;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revocation_reason")
    private String revocationReason;

    @Column(name = "replaced_by_cert_number", length = 30)
    private String replacedByCertNumber;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Certificate() {
        // JPA
    }

    public static Certificate create(CertificateType type, UUID templateId,
                                     UUID issuedBy, String issuedByName,
                                     String certNumber, String qrCode,
                                     LocalDate validFrom, String templateData) {
        Certificate c = new Certificate();
        c.id = UUID.randomUUID();
        c.certificateNumber = certNumber;
        c.certificateType = type;
        c.status = CertificateStatus.ISSUED;
        c.templateId = templateId;
        c.issuedBy = issuedBy;
        c.issuedByName = issuedByName;
        c.issuedAt = Instant.now();
        c.validFrom = validFrom;
        c.qrCode = qrCode;
        c.templateData = templateData;
        c.updatedAt = Instant.now();
        return c;
    }

    // --- State transitions ---

    public void revoke(UUID revokedBy, String reason) {
        if (this.status != CertificateStatus.ISSUED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Only ISSUED certificates can be revoked. Current: " + this.status);
        }
        this.status = CertificateStatus.REVOKED;
        this.revokedBy = revokedBy;
        this.revokedAt = Instant.now();
        this.revocationReason = reason;
        this.updatedAt = Instant.now();
    }

    public void expire() {
        if (this.status == CertificateStatus.ISSUED) {
            this.status = CertificateStatus.EXPIRED;
            this.updatedAt = Instant.now();
        }
    }

    public void replace(String newCertNumber) {
        if (this.status != CertificateStatus.ISSUED) {
            throw new BusinessRuleViolationException(ERR_STATUS,
                    "Only ISSUED certificates can be replaced. Current: " + this.status);
        }
        this.status = CertificateStatus.REPLACED;
        this.replacedByCertNumber = newCertNumber;
        this.updatedAt = Instant.now();
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public String getCertificateNumber() { return certificateNumber; }
    public CertificateType getCertificateType() { return certificateType; }
    public CertificateStatus getStatus() { return status; }
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
    public String getTemplateData() { return templateData; }
    public String getDigitalSignatureHash() { return digitalSignatureHash; }
    public UUID getRevokedBy() { return revokedBy; }
    public Instant getRevokedAt() { return revokedAt; }
    public String getRevocationReason() { return revocationReason; }
    public String getReplacedByCertNumber() { return replacedByCertNumber; }
    public Long getVersion() { return version; }
    public Instant getUpdatedAt() { return updatedAt; }

    // --- Setters for optional subject fields ---

    public void setSubjectAnimalId(UUID subjectAnimalId) { this.subjectAnimalId = subjectAnimalId; }
    public void setSubjectAnimalCode(String subjectAnimalCode) { this.subjectAnimalCode = subjectAnimalCode; }
    public void setSubjectConsignmentId(UUID subjectConsignmentId) { this.subjectConsignmentId = subjectConsignmentId; }
    public void setSubjectMovementId(UUID subjectMovementId) { this.subjectMovementId = subjectMovementId; }
    public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }
    public void setDigitalSignatureHash(String digitalSignatureHash) { this.digitalSignatureHash = digitalSignatureHash; }
}
