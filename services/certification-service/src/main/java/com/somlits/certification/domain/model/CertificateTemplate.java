package com.somlits.certification.domain.model;

import com.somlits.certification.domain.enums.CertificateType;
import com.somlits.certification.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "certificate_template")
public class CertificateTemplate {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "template_code", nullable = false, unique = true, length = 20, updatable = false)
    private String templateCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "certificate_type", nullable = false, length = 40, updatable = false)
    private CertificateType certificateType;

    @Column(name = "template_name", nullable = false, length = 200)
    private String templateName;

    @Column(name = "template_version", nullable = false, length = 20)
    private String templateVersion;

    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "required_fields", columnDefinition = "TEXT")
    private String requiredFields;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = Boolean.TRUE;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deactivated_at")
    private Instant deactivatedAt;

    protected CertificateTemplate() {
        // JPA
    }

    public static CertificateTemplate create(String templateCode, CertificateType certificateType,
                                              String templateName, String templateVersion,
                                              String bodyTemplate, String requiredFields, UUID createdBy) {
        CertificateTemplate t = new CertificateTemplate();
        t.id = UUID.randomUUID();
        t.templateCode = templateCode;
        t.certificateType = certificateType;
        t.templateName = templateName;
        t.templateVersion = templateVersion;
        t.bodyTemplate = bodyTemplate;
        t.requiredFields = requiredFields;
        t.createdBy = createdBy;
        t.isActive = Boolean.TRUE;
        t.createdAt = Instant.now();
        return t;
    }

    public void deactivate() {
        if (!Boolean.TRUE.equals(this.isActive)) {
            throw new BusinessRuleViolationException("ERR-CERT-010",
                    "Template is already inactive");
        }
        this.isActive = Boolean.FALSE;
        this.deactivatedAt = Instant.now();
    }

    // --- Getters ---

    public UUID getId() { return id; }
    public String getTemplateCode() { return templateCode; }
    public CertificateType getCertificateType() { return certificateType; }
    public String getTemplateName() { return templateName; }
    public String getTemplateVersion() { return templateVersion; }
    public String getBodyTemplate() { return bodyTemplate; }
    public String getRequiredFields() { return requiredFields; }
    public Boolean getIsActive() { return isActive; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeactivatedAt() { return deactivatedAt; }

    public void setTemplateName(String templateName) { this.templateName = templateName; }
    public void setTemplateVersion(String templateVersion) { this.templateVersion = templateVersion; }
    public void setBodyTemplate(String bodyTemplate) { this.bodyTemplate = bodyTemplate; }
    public void setRequiredFields(String requiredFields) { this.requiredFields = requiredFields; }
}
