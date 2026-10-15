package com.somlits.certification.api.v1.dto.request;

import com.somlits.certification.domain.enums.CertificateType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public class IssueCertificateRequest {

    @NotNull(message = "certificateType is required")
    private CertificateType certificateType;

    private UUID templateId;

    @NotBlank(message = "issuedByName is required")
    private String issuedByName;

    @NotNull(message = "validFrom is required")
    private LocalDate validFrom;

    private LocalDate validUntil;

    private UUID subjectAnimalId;
    private String subjectAnimalCode;
    private UUID subjectConsignmentId;
    private UUID subjectMovementId;
    private String templateData;

    public CertificateType getCertificateType() { return certificateType; }
    public void setCertificateType(CertificateType certificateType) { this.certificateType = certificateType; }

    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }

    public String getIssuedByName() { return issuedByName; }
    public void setIssuedByName(String issuedByName) { this.issuedByName = issuedByName; }

    public LocalDate getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDate validFrom) { this.validFrom = validFrom; }

    public LocalDate getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }

    public UUID getSubjectAnimalId() { return subjectAnimalId; }
    public void setSubjectAnimalId(UUID subjectAnimalId) { this.subjectAnimalId = subjectAnimalId; }

    public String getSubjectAnimalCode() { return subjectAnimalCode; }
    public void setSubjectAnimalCode(String subjectAnimalCode) { this.subjectAnimalCode = subjectAnimalCode; }

    public UUID getSubjectConsignmentId() { return subjectConsignmentId; }
    public void setSubjectConsignmentId(UUID subjectConsignmentId) { this.subjectConsignmentId = subjectConsignmentId; }

    public UUID getSubjectMovementId() { return subjectMovementId; }
    public void setSubjectMovementId(UUID subjectMovementId) { this.subjectMovementId = subjectMovementId; }

    public String getTemplateData() { return templateData; }
    public void setTemplateData(String templateData) { this.templateData = templateData; }
}
