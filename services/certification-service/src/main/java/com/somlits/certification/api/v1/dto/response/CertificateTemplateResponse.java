package com.somlits.certification.api.v1.dto.response;

import com.somlits.certification.domain.model.CertificateTemplate;

import java.time.Instant;
import java.util.UUID;

public class CertificateTemplateResponse {

    private UUID id;
    private String templateCode;
    private String certificateType;
    private String templateName;
    private String templateVersion;
    private String bodyTemplate;
    private String requiredFields;
    private Boolean isActive;
    private UUID createdBy;
    private Instant createdAt;
    private Instant deactivatedAt;

    public static CertificateTemplateResponse from(CertificateTemplate t) {
        CertificateTemplateResponse r = new CertificateTemplateResponse();
        r.id = t.getId();
        r.templateCode = t.getTemplateCode();
        r.certificateType = t.getCertificateType().name();
        r.templateName = t.getTemplateName();
        r.templateVersion = t.getTemplateVersion();
        r.bodyTemplate = t.getBodyTemplate();
        r.requiredFields = t.getRequiredFields();
        r.isActive = t.getIsActive();
        r.createdBy = t.getCreatedBy();
        r.createdAt = t.getCreatedAt();
        r.deactivatedAt = t.getDeactivatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getTemplateCode() { return templateCode; }
    public String getCertificateType() { return certificateType; }
    public String getTemplateName() { return templateName; }
    public String getTemplateVersion() { return templateVersion; }
    public String getBodyTemplate() { return bodyTemplate; }
    public String getRequiredFields() { return requiredFields; }
    public Boolean getIsActive() { return isActive; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeactivatedAt() { return deactivatedAt; }
}
