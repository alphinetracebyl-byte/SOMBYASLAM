package com.somlits.certification.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.certification.application.CertificateNumberGenerator;
import com.somlits.certification.application.CertificateTemplateCodeGenerator;
import com.somlits.certification.application.OutboxService;
import com.somlits.certification.domain.enums.CertificateType;
import com.somlits.certification.domain.enums.VerificationResult;
import com.somlits.certification.domain.exception.DomainConflictException;
import com.somlits.certification.domain.exception.DomainNotFoundException;
import com.somlits.certification.domain.model.Certificate;
import com.somlits.certification.domain.model.CertificateTemplate;
import com.somlits.certification.domain.model.VerificationLog;
import com.somlits.certification.domain.repository.CertificateRepository;
import com.somlits.certification.domain.repository.CertificateTemplateRepository;
import com.somlits.certification.domain.repository.VerificationLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CertificationService {

    private static final Logger log = LoggerFactory.getLogger(CertificationService.class);

    private final CertificateTemplateRepository templateRepo;
    private final CertificateRepository certRepo;
    private final VerificationLogRepository verificationLogRepo;
    private final CertificateNumberGenerator certNumberGen;
    private final CertificateTemplateCodeGenerator templateCodeGen;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public CertificationService(CertificateTemplateRepository templateRepo,
                                 CertificateRepository certRepo,
                                 VerificationLogRepository verificationLogRepo,
                                 CertificateNumberGenerator certNumberGen,
                                 CertificateTemplateCodeGenerator templateCodeGen,
                                 OutboxService outbox,
                                 ObjectMapper objectMapper) {
        this.templateRepo = templateRepo;
        this.certRepo = certRepo;
        this.verificationLogRepo = verificationLogRepo;
        this.certNumberGen = certNumberGen;
        this.templateCodeGen = templateCodeGen;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    // ---- Certificate Template Commands ----

    @Transactional
    public CertificateTemplate createTemplate(CertificateType type, String templateName,
                                               String templateVersion, String bodyTemplate,
                                               String requiredFields, UUID createdBy) {
        String code = templateCodeGen.next();
        CertificateTemplate t = CertificateTemplate.create(code, type, templateName,
                templateVersion, bodyTemplate, requiredFields, createdBy);
        templateRepo.save(t);
        log.info("Certificate template created: code={} type={}", code, type);
        return t;
    }

    @Transactional
    public void deactivateTemplate(UUID templateId) {
        CertificateTemplate t = templateRepo.findById(templateId)
                .orElseThrow(() -> new DomainNotFoundException("Template not found: " + templateId));
        t.deactivate();
        templateRepo.save(t);
        log.info("Certificate template deactivated: id={}", templateId);
    }

    // ---- Certificate Commands ----

    @Transactional
    public Certificate issueCertificate(CertificateType type, UUID templateId,
                                         UUID issuedBy, String issuedByName,
                                         LocalDate validFrom, LocalDate validUntil,
                                         UUID subjectAnimalId, String subjectAnimalCode,
                                         UUID subjectConsignmentId, UUID subjectMovementId,
                                         String templateData) {
        String certNumber = certNumberGen.next(type);
        String qrCode = "QR-" + certNumber;

        Certificate cert = Certificate.create(type, templateId, issuedBy, issuedByName,
                certNumber, qrCode, validFrom, templateData);
        cert.setSubjectAnimalId(subjectAnimalId);
        cert.setSubjectAnimalCode(subjectAnimalCode);
        cert.setSubjectConsignmentId(subjectConsignmentId);
        cert.setSubjectMovementId(subjectMovementId);
        cert.setValidUntil(validUntil);

        certRepo.save(cert);

        publishEvent("CertificateIssuedEvent", "Certificate", cert.getId(),
                Map.of("certId", cert.getId(),
                       "certNumber", certNumber,
                       "certType", type.name(),
                       "issuedBy", issuedBy));

        log.info("Certificate issued: number={} type={}", certNumber, type);
        return cert;
    }

    @Transactional
    public void revokeCertificate(String certNumber, UUID revokedBy, String reason) {
        Certificate cert = certRepo.findByCertificateNumber(certNumber)
                .orElseThrow(() -> new DomainNotFoundException("Certificate not found: " + certNumber));
        cert.revoke(revokedBy, reason);
        certRepo.save(cert);
        publishEvent("CertificateRevokedEvent", "Certificate", cert.getId(),
                Map.of("certId", cert.getId(), "certNumber", certNumber, "reason", reason));
        log.info("Certificate revoked: number={}", certNumber);
    }

    @Transactional
    public Certificate replaceCertificate(String oldCertNumber, UUID issuedBy, String issuedByName,
                                           LocalDate validFrom, LocalDate validUntil,
                                           String templateData) {
        Certificate old = certRepo.findByCertificateNumber(oldCertNumber)
                .orElseThrow(() -> new DomainNotFoundException("Certificate not found: " + oldCertNumber));

        String newCertNumber = certNumberGen.next(old.getCertificateType());
        String newQrCode = "QR-" + newCertNumber;
        Certificate newCert = Certificate.create(old.getCertificateType(), old.getTemplateId(),
                issuedBy, issuedByName,
                newCertNumber, newQrCode,
                validFrom, templateData);
        newCert.setSubjectAnimalId(old.getSubjectAnimalId());
        newCert.setSubjectAnimalCode(old.getSubjectAnimalCode());
        newCert.setSubjectConsignmentId(old.getSubjectConsignmentId());
        newCert.setSubjectMovementId(old.getSubjectMovementId());
        newCert.setValidUntil(validUntil);
        certRepo.save(newCert);

        old.replace(newCert.getCertificateNumber());
        certRepo.save(old);

        log.info("Certificate replaced: old={} new={}", oldCertNumber, newCert.getCertificateNumber());
        return newCert;
    }

    // ---- Verification ----

    @Transactional
    public VerificationResponse verify(String qrCode, String verifierIp) {
        Optional<Certificate> optCert = certRepo.findByQrCode(qrCode);

        if (optCert.isEmpty()) {
            verificationLogRepo.save(VerificationLog.log(null, qrCode, verifierIp, VerificationResult.NOT_FOUND));
            return new VerificationResponse(false, null, null, null, null, null, null, VerificationResult.NOT_FOUND);
        }

        Certificate cert = optCert.get();
        VerificationResult result;

        if (cert.getStatus().name().equals("REVOKED")) {
            result = VerificationResult.REVOKED;
        } else if (cert.getStatus().name().equals("EXPIRED")
                || (cert.getValidUntil() != null && LocalDate.now().isAfter(cert.getValidUntil()))) {
            result = VerificationResult.EXPIRED;
        } else {
            result = VerificationResult.VALID;
        }

        verificationLogRepo.save(VerificationLog.log(cert.getId(), qrCode, verifierIp, result));

        return new VerificationResponse(
                result == VerificationResult.VALID,
                cert.getCertificateNumber(),
                cert.getCertificateType().name(),
                cert.getStatus().name(),
                cert.getIssuedAt(),
                cert.getValidUntil(),
                cert.getSubjectAnimalCode(),
                result
        );
    }

    // ---- Queries ----

    @Transactional(readOnly = true)
    public CertificateTemplate getTemplate(UUID id) {
        return templateRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Template not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<CertificateTemplate> listActiveTemplates() {
        return templateRepo.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Certificate getCertificate(String certNumber) {
        return certRepo.findByCertificateNumber(certNumber)
                .orElseThrow(() -> new DomainNotFoundException("Certificate not found: " + certNumber));
    }

    @Transactional(readOnly = true)
    public Certificate getCertificateById(UUID id) {
        return certRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Certificate not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Certificate> getCertificatesByAnimal(UUID animalId) {
        return certRepo.findBySubjectAnimalIdOrderByIssuedAtDesc(animalId);
    }

    @Transactional(readOnly = true)
    public List<Certificate> getCertificatesByConsignment(UUID consignmentId) {
        return certRepo.findBySubjectConsignmentId(consignmentId);
    }

    @Transactional(readOnly = true)
    public Page<Certificate> listCertificates(Pageable pageable) {
        return certRepo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<VerificationLog> getVerificationLogs(UUID certId) {
        return verificationLogRepo.findByCertificateId(certId);
    }

    private void publishEvent(String type, String aggregate, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggregate, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }

    // ---- Nested DTO ----

    public record VerificationResponse(
            boolean valid,
            String certificateNumber,
            String type,
            String status,
            java.time.Instant issuedAt,
            LocalDate validUntil,
            String subjectAnimalCode,
            VerificationResult verificationResult
    ) {}
}
