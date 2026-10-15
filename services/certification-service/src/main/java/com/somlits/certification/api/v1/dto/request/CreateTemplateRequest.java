package com.somlits.certification.api.v1.dto.request;

import com.somlits.certification.domain.enums.CertificateType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateTemplateRequest {

    @NotNull(message = "certificateType is required")
    private CertificateType certificateType;

    @NotBlank(message = "templateName is required")
    private String templateName;

    @NotBlank(message = "templateVersion is required")
    private String templateVersion;

    @NotBlank(message = "bodyTemplate is required")
    private String bodyTemplate;

    private String requiredFields;

    public CertificateType getCertificateType() { return certificateType; }
    public void setCertificateType(CertificateType certificateType) { this.certificateType = certificateType; }

    public String getTemplateName() { return templateName; }
    public void setTemplateName(String templateName) { this.templateName = templateName; }

    public String getTemplateVersion() { return templateVersion; }
    public void setTemplateVersion(String templateVersion) { this.templateVersion = templateVersion; }

    public String getBodyTemplate() { return bodyTemplate; }
    public void setBodyTemplate(String bodyTemplate) { this.bodyTemplate = bodyTemplate; }

    public String getRequiredFields() { return requiredFields; }
    public void setRequiredFields(String requiredFields) { this.requiredFields = requiredFields; }
}
